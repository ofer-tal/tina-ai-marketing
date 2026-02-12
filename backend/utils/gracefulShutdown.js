/**
 * Graceful Shutdown Coordinator
 *
 * This module provides centralized shutdown coordination with active job tracking.
 * It integrates with PM2's process management and protects long-running jobs.
 *
 * Features:
 * - Active job tracking (register/unregister during execution)
 * - Drain mode (stop accepting new jobs during shutdown)
 * - 60-second graceful shutdown timeout
 * - Job completion waiting before forcing exit
 * - Safe restart checks
 *
 * @module utils/gracefulShutdown
 */

import { getLogger } from "./logger.js";

const logger = getLogger("utils", "gracefulShutdown");

/**
 * Shutdown state management
 */
class ShutdownCoordinator {
  constructor() {
    this.isShuttingDown = false;
    this.isDraining = false;
    this.activeJobs = new Map(); // jobId -> { name, startTime, details }
    this.shutdownTimeout = 60000; // 60 seconds
    this.gracefulShutdownHandler = null;
  }

  /**
   * Register an active job
   * Call this when a long-running job starts
   *
   * @param {string} jobId - Unique job identifier
   * @param {string} name - Human-readable job name
   * @param {object} details - Additional job details
   */
  registerJob(jobId, name, details = {}) {
    const jobInfo = {
      name,
      startTime: Date.now(),
      details,
    };

    this.activeJobs.set(jobId, jobInfo);

    logger.debug("Job registered", {
      jobId,
      name,
      activeJobs: this.activeJobs.size,
    });

    return jobId;
  }

  /**
   * Unregister an active job
   * Call this when a job completes (success or failure)
   *
   * @param {string} jobId - Job identifier to unregister
   */
  unregisterJob(jobId) {
    if (this.activeJobs.has(jobId)) {
      const jobInfo = this.activeJobs.get(jobId);
      const duration = Date.now() - jobInfo.startTime;

      this.activeJobs.delete(jobId);

      logger.debug("Job unregistered", {
        jobId,
        name: jobInfo.name,
        duration: `${duration}ms`,
        activeJobs: this.activeJobs.size,
      });
    }
  }

  /**
   * Check if we're in drain mode
   * When true, schedulers should not start new jobs
   *
   * @returns {boolean}
   */
  isDrainMode() {
    return this.isDraining;
  }

  /**
   * Check if we can safely restart
   * Returns false if there are active jobs or shutdown is in progress
   *
   * @returns {object} { canRestart: boolean, reason?: string, activeJobs?: number }
   */
  canRestart() {
    if (this.isShuttingDown) {
      return {
        canRestart: false,
        reason: "Shutdown already in progress",
      };
    }

    const activeJobCount = this.activeJobs.size;
    if (activeJobCount > 0) {
      const jobList = Array.from(this.activeJobs.values()).map((j) => j.name);
      return {
        canRestart: false,
        reason: `${activeJobCount} active job(s)`,
        activeJobs: activeJobCount,
        jobList,
      };
    }

    return { canRestart: true };
  }

  /**
   * Get active job information
   *
   * @returns {Array} Array of active job objects
   */
  getActiveJobs() {
    return Array.from(this.activeJobs.entries()).map(([id, info]) => ({
      id,
      ...info,
      duration: Date.now() - info.startTime,
    }));
  }

  /**
   * Enter drain mode
   * Stops accepting new jobs but allows existing jobs to complete
   */
  enterDrainMode() {
    if (!this.isDraining) {
      this.isDraining = true;
      logger.info("Entering drain mode - no new jobs will be scheduled");

      // Notify any listeners (e.g., schedulers)
      this.emitDrainStatusChange(true);
    }
  }

  /**
   * Exit drain mode (typically during testing)
   */
  exitDrainMode() {
    if (this.isDraining) {
      this.isDraining = false;
      logger.info("Exiting drain mode - new jobs can be scheduled");

      this.emitDrainStatusChange(false);
    }
  }

  /**
   * Emit drain status change event
   * Schedulers can listen to this via EventEmitter
   */
  emitDrainStatusChange(isDraining) {
    // This can be extended to use EventEmitter if needed
    // For now, rely on schedulers polling isDrainMode()
    logger.debug("Drain status changed", { isDraining });
  }

  /**
   * Wait for active jobs to complete
   *
   * @param {number} timeout - Maximum time to wait in milliseconds
   * @returns {Promise<boolean>} - true if all jobs completed, false if timeout
   */
  async waitForActiveJobs(timeout = this.shutdownTimeout) {
    const startTime = Date.now();
    const initialCount = this.activeJobs.size;

    if (initialCount === 0) {
      logger.info("No active jobs to wait for");
      return true;
    }

    logger.info(`Waiting for ${initialCount} active job(s) to complete`, {
      timeout: `${timeout}ms`,
      jobs: this.getActiveJobs().map((j) => ({ name: j.name, duration: `${j.duration}ms` })),
    });

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = this.activeJobs.size;

        if (remaining === 0) {
          clearInterval(checkInterval);
          const duration = Date.now() - startTime;
          logger.info(`All jobs completed in ${duration}ms`);
          resolve(true);
        } else if (elapsed >= timeout) {
          clearInterval(checkInterval);
          const jobsStillRunning = this.getActiveJobs();
          logger.warn(`Timeout waiting for jobs after ${elapsed}ms`, {
            remaining,
            jobs: jobsStillRunning.map((j) => ({
              name: j.name,
              duration: `${j.duration}ms`,
            })),
          });
          resolve(false);
        } else {
          // Log progress periodically
          if (elapsed % 10000 < 1000) {
            logger.debug(`Still waiting for ${remaining} job(s)`, {
              elapsed: `${elapsed}ms`,
            });
          }
        }
      }, 500);
    });
  }

  /**
   * Initiate graceful shutdown
   *
   * @param {string} signal - Signal that triggered shutdown (SIGTERM, SIGINT, etc.)
   * @param {Function} actualShutdownFn - The actual shutdown function to call
   */
  async shutdown(signal, actualShutdownFn) {
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress, ignoring signal");
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Starting graceful shutdown (${signal})`);

    // Enter drain mode immediately
    this.enterDrainMode();

    const startTime = Date.now();

    try {
      // Wait for active jobs to complete
      const jobsCompleted = await this.waitForActiveJobs(this.shutdownTimeout);

      if (!jobsCompleted) {
        logger.warn(`Some jobs did not complete within ${this.shutdownTimeout}ms`);
      }

      // Call the actual shutdown function
      if (typeof actualShutdownFn === "function") {
        await actualShutdownFn();
      }

      const duration = Date.now() - startTime;
      logger.info(`Graceful shutdown completed in ${duration}ms`);
    } catch (error) {
      logger.error("Error during graceful shutdown", {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Set the actual shutdown handler
   * This is typically the server.js gracefulShutdown function
   *
   * @param {Function} handler - The shutdown function to wrap
   */
  setShutdownHandler(handler) {
    this.gracefulShutdownHandler = handler;
  }

  /**
   * Create a PM2-compatible shutdown handler
   * Returns a function that PM2 can call on shutdown signals
   *
   * @returns {Function}
   */
  createPM2ShutdownHandler() {
    return async (signal) => {
      await this.shutdown(signal, this.gracefulShutdownHandler);
    };
  }

  /**
   * Reset shutdown state (for testing)
   */
  reset() {
    this.isShuttingDown = false;
    this.isDraining = false;
    this.activeJobs.clear();
    logger.debug("Shutdown coordinator state reset");
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isShuttingDown: this.isShuttingDown,
      isDraining: this.isDraining,
      activeJobCount: this.activeJobs.size,
      activeJobs: this.getActiveJobs(),
    };
  }
}

// Singleton instance
const shutdownCoordinator = new ShutdownCoordinator();

export default shutdownCoordinator;

// Export the class for testing
export { ShutdownCoordinator };
