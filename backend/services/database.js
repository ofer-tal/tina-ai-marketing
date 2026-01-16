import mongoose from 'mongoose';
import winston from 'winston';

// Create logger for database operations
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.File({ filename: 'logs/database-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/database.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Connection configuration
const connectionOptions = {
  // Connection pooling
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2,  // Keep minimum 2 socket connections
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  heartbeatFrequencyMS: 10000, // Check the status of the connection every 10 seconds

  // Retry logic
  retryWrites: true,
  retryReads: true,

  // Buffering
  bufferCommands: true, // Enable mongoose buffering
  
  // Other options
  autoIndex: process.env.NODE_ENV !== 'production', // Build indexes in development only
};

class DatabaseService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
    this.reconnectionAttempts = []; // Track reconnection history
    this.maxReconnectionHistory = 50; // Keep last 50 reconnection attempts
    this.persistentFailureCount = 0; // Count consecutive failures
    this.lastSuccessfulConnection = null;
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    const attemptId = Date.now();
    logger.info('Attempting to connect to MongoDB...', {
      uri: this.sanitizeUri(mongoUri),
      attemptId
    });

    // Log connection attempt
    this.logConnectionAttempt(attemptId, 'connecting', null);

    try {
      // Connect to MongoDB
      this.connection = await mongoose.connect(mongoUri, connectionOptions);

      this.isConnected = true;
      this.retryAttempts = 0;
      this.persistentFailureCount = 0;
      this.lastSuccessfulConnection = new Date();

      logger.info('Successfully connected to MongoDB', {
        database: this.connection.connection.name,
        host: this.connection.connection.host,
        port: this.connection.connection.port,
      });

      // Log successful connection
      this.logConnectionAttempt(attemptId, 'success', null);

      // Set up connection event listeners
      this.setupEventListeners();

      // Test the connection
      await this.testConnection();

      return this.connection;
    } catch (error) {
      this.isConnected = false;
      this.persistentFailureCount++;

      logger.error('Failed to connect to MongoDB', {
        error: error.message,
        attempt: this.retryAttempts + 1,
        maxRetries: this.maxRetries,
        persistentFailures: this.persistentFailureCount,
      });

      // Log failed connection attempt
      this.logConnectionAttempt(attemptId, 'failed', error.message);

      // Implement retry logic with exponential backoff
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);

        logger.info(`Retrying connection in ${delay}ms... (Attempt ${this.retryAttempts}/${this.maxRetries})`);

        await this.sleep(delay);
        return this.connect(); // Recursive retry
      } else {
        logger.error('Max retry attempts reached. Giving up.', {
          persistentFailures: this.persistentFailureCount,
        });
        throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`);
      }
    }
  }

  /**
   * Set up MongoDB connection event listeners
   */
  setupEventListeners() {
    if (!this.connection) return;

    const db = this.connection.connection;

    db.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
      this.isConnected = true;
      this.persistentFailureCount = 0;
      this.lastSuccessfulConnection = new Date();
    });

    db.on('error', (err) => {
      logger.error('Mongoose connection error', { error: err.message });
      this.isConnected = false;
      this.persistentFailureCount++;
      this.logConnectionAttempt(Date.now(), 'error', err.message);
    });

    db.on('disconnected', () => {
      logger.warn('Mongoose disconnected', {
        persistentFailures: this.persistentFailureCount,
      });
      this.isConnected = false;
      this.logConnectionAttempt(Date.now(), 'disconnected', 'Connection lost');

      // Attempt reconnection after a delay
      this.attemptReconnection();
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Attempt automatic reconnection after disconnection
   */
  async attemptReconnection() {
    const reconnectionDelay = 5000; // 5 seconds

    logger.info(`Scheduling reconnection attempt in ${reconnectionDelay}ms...`);

    setTimeout(async () => {
      if (!this.isConnected) {
        logger.info('Attempting to reconnect to MongoDB...');

        try {
          this.logConnectionAttempt(Date.now(), 'reconnecting', null);

          await mongoose.connect(process.env.MONGODB_URI, connectionOptions);

          this.isConnected = true;
          this.persistentFailureCount = 0;
          this.lastSuccessfulConnection = new Date();

          logger.info('Successfully reconnected to MongoDB');
          this.logConnectionAttempt(Date.now(), 'reconnected', null);
        } catch (error) {
          this.persistentFailureCount++;
          logger.error('Reconnection attempt failed', {
            error: error.message,
            persistentFailures: this.persistentFailureCount,
          });
          this.logConnectionAttempt(Date.now(), 'reconnection_failed', error.message);

          // Schedule another reconnection attempt
          if (this.persistentFailureCount < 10) {
            this.attemptReconnection();
          } else {
            logger.error('Max reconnection attempts reached. Manual intervention required.');
          }
        }
      }
    }, reconnectionDelay);
  }

  /**
   * Log connection attempt to history
   */
  logConnectionAttempt(attemptId, status, errorMessage) {
    const attempt = {
      attemptId,
      timestamp: new Date().toISOString(),
      status,
      errorMessage,
    };

    this.reconnectionAttempts.push(attempt);

    // Keep only the last N attempts
    if (this.reconnectionAttempts.length > this.maxReconnectionHistory) {
      this.reconnectionAttempts.shift();
    }

    logger.debug('Connection attempt logged', {
      attemptId,
      status,
      historySize: this.reconnectionAttempts.length,
    });
  }

  /**
   * Test the MongoDB connection by executing a command
   */
  async testConnection() {
    try {
      const admin = mongoose.connection.db.admin();
      const result = await admin.serverStatus();

      logger.info('MongoDB connection test successful', {
        version: result.version,
        process: result.process,
      });

      return true;
    } catch (error) {
      logger.error('MongoDB connection test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Test read access to existing collections
   */
  async testReadAccess() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      logger.info('Available collections in database', {
        count: collections.length,
        collections: collections.map(c => c.name),
      });

      // Test read access to specific collections if they exist
      const testCollections = ['stories', 'users', 'appstore-notifications', 'appstore-transactions'];

      for (const collectionName of testCollections) {
        const exists = collections.some(c => c.name === collectionName);

        if (exists) {
          const count = await db.collection(collectionName).countDocuments();
          logger.info(`Read access test passed for collection: ${collectionName}`, { count });
        } else {
          logger.info(`Collection does not exist yet: ${collectionName}`);
        }
      }

      // Verify marketing_* collections can be created (write access)
      const testCollectionName = 'marketing_test';
      await db.createCollection(testCollectionName);
      await db.collection(testCollectionName).insertOne({ test: true, timestamp: new Date() });
      await db.collection(testCollectionName).drop();
      logger.info('Write access test passed for marketing_* collections');

      return true;
    } catch (error) {
      logger.error('MongoDB read/write access test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', { error: error.message });
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      readyStateText: this.getReadyStateText(mongoose.connection.readyState),
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      persistentFailureCount: this.persistentFailureCount,
      lastSuccessfulConnection: this.lastSuccessfulConnection,
      reconnectionHistory: this.reconnectionAttempts.slice(-10), // Last 10 attempts
    };
  }

  /**
   * Get human-readable ready state text
   */
  getReadyStateText(state) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[state] || 'unknown';
  }

  /**
   * Sanitize MongoDB URI for logging (hide password)
   */
  sanitizeUri(uri) {
    try {
      const url = new URL(uri);
      if (url.password) {
        url.password = '****';
      }
      return url.toString();
    } catch {
      return 'mongodb://[hidden]';
    }
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;
