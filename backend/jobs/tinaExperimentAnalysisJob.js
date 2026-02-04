import MarketingExperiment from '../models/MarketingExperiment.js';
import TinaObservation from '../models/TinaObservation.js';
import { generateObservationId } from '../utils/tinaIdGenerator.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('jobs', 'tina-experiment-analysis');

/**
 * Analyze completed experiments
 *
 * Finds experiments past their endDate but still marked as running,
 * runs analysis, and creates observations for the user.
 */
export async function analyzeCompletedExperiments() {
  // Find experiments past endDate but still marked as running
  const overdueExperiments = await MarketingExperiment.find({
    status: 'running',
    endDate: { $lt: new Date() }
  });

  let analyzedCount = 0;
  let observationCreated = 0;

  for (const experiment of overdueExperiments) {
    try {
      // Run analysis
      await experiment.analyze();

      logger.info('Experiment analyzed', {
        experimentId: experiment.experimentId,
        name: experiment.name,
        winner: experiment.winningVariant
      });

      analyzedCount++;

      // Create observation for user if there's a winner
      if (experiment.winningVariant) {
        const winningResult = experiment.results.find(r => r.variantName === experiment.winningVariant);
        const isSignificant = winningResult?.isSignificant || false;

        await TinaObservation.create({
          observationId: generateObservationId(),
          urgency: isSignificant ? 'medium' : 'low',
          category: 'experiment_result',
          title: `Experiment Complete: ${experiment.name}`,
          summary: `Winner: ${experiment.winningVariant}. ${isSignificant ? 'Statistically significant results.' : 'More data needed for significance.'}`,
          details: {
            what: `A/B test "${experiment.name}" has completed`,
            why: 'Experiment duration ended',
            data: {
              experimentId: experiment.experimentId,
              winner: experiment.winningVariant,
              variants: experiment.variants.map(v => ({
                name: v.name,
                value: v.metrics.get(experiment.successMetric),
                sampleSize: v.sampleSize
              })),
              significance: isSignificant ? winningResult.confidence : null,
              confidence: winningResult?.confidence || null
            },
            suggestedActions: [{
              toolName: 'get_experiment_results',
              parameters: { experimentId: experiment.experimentId },
              rationale: 'Review detailed experiment results',
              priority: 'medium'
            }]
          },
          relatedExperimentId: experiment._id,
          status: 'pending',
          createdAt: new Date()
        });

        observationCreated++;

        logger.info('Observation created for completed experiment', {
          experimentId: experiment.experimentId,
          observationUrgency: isSignificant ? 'medium' : 'low'
        });
      }
    } catch (error) {
      logger.error('Error analyzing experiment', {
        experimentId: experiment.experimentId,
        error: error.message,
        stack: error.stack
      });
    }
  }

  logger.info('Experiment analysis complete', {
    analyzed: analyzedCount,
    observationsCreated: observationCreated
  });

  return {
    analyzed: analyzedCount,
    observationsCreated: observationCreated
  };
}

/**
 * Check for experiments that need more samples
 *
 * Finds running experiments that haven't reached minimum sample size
 * and creates observations if they're falling behind.
 */
export async function checkExperimentSampleSizes() {
  const needingSamples = await MarketingExperiment.getNeedingSamples();

  let alertsCreated = 0;

  for (const experiment of needingSamples) {
    try {
      // Calculate days elapsed
      const daysElapsed = Math.floor((new Date() - experiment.startDate) / (1000 * 60 * 60 * 24));
      const daysTotal = experiment.duration;
      const progressPercent = (daysElapsed / daysTotal) * 100;

      // Only alert if more than halfway through and significantly behind
      if (progressPercent > 50 && experiment.currentSampleSize < experiment.minSampleSize * 0.3) {
        // Check if we already have a recent observation for this
        const existingObs = await TinaObservation.findOne({
          relatedExperimentId: experiment._id,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });

        if (!existingObs) {
          await TinaObservation.create({
            observationId: generateObservationId(),
            urgency: 'low',
            category: 'experiment_result',
            title: `Experiment Needs More Data: ${experiment.name}`,
            summary: `Only ${experiment.currentSampleSize} samples collected. Need ${experiment.minSampleSize} minimum.`,
            details: {
              what: 'Experiment is not collecting sufficient data',
              why: 'Sample size is below minimum threshold',
              data: {
                experimentId: experiment.experimentId,
                currentSampleSize: experiment.currentSampleSize,
                minSampleSize: experiment.minSampleSize,
                progressPercent: Math.round(progressPercent)
              },
              suggestedActions: [{
                toolName: 'get_experiment_results',
                parameters: { experimentId: experiment.experimentId },
                rationale: 'Review current experiment progress',
                priority: 'low'
              }]
            },
            relatedExperimentId: experiment._id,
            status: 'pending',
            createdAt: new Date()
          });

          alertsCreated++;

          logger.info('Low sample size alert created', {
            experimentId: experiment.experimentId,
            currentSampleSize: experiment.currentSampleSize,
            minSampleSize: experiment.minSampleSize
          });
        }
      }
    } catch (error) {
      logger.error('Error checking experiment sample size', {
        experimentId: experiment.experimentId,
        error: error.message
      });
    }
  }

  logger.info('Experiment sample size check complete', {
    checked: needingSamples.length,
    alertsCreated
  });

  return {
    checked: needingSamples.length,
    alertsCreated
  };
}
