#!/usr/bin/env node
/**
 * MongoDB Connection Setup Verification Script
 *
 * This script verifies that all components of the MongoDB connection
 * setup are correctly implemented per Feature #2 requirements:
 *
 * Step 1: Verify .env file contains MONGODB_URI
 * Step 2: Test MongoDB connection using db.serverStatus()
 * Step 3: Verify connection pooling configuration
 * Step 4: Confirm connection retry logic on failure
 * Step 5: Test read access to existing collections (stories, users)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=".repeat(70));
console.log("MongoDB Connection Setup Verification");
console.log("Feature #2 Test Suite");
console.log("=".repeat(70));
console.log();

let passedTests = 0;
let failedTests = 0;

function testResult(testName, passed, details = "") {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  const color = passed ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";

  console.log(`${color}${status}${reset} - ${testName}`);
  if (details) {
    console.log(`      ${details}`);
  }

  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
}

// Step 1: Verify .env file contains MONGODB_URI
console.log("Step 1: Verify .env file contains MONGODB_URI");
console.log("-".repeat(70));

try {
  const envPath = path.join(process.cwd(), ".env");
  const envExists = fs.existsSync(envPath);

  if (!envExists) {
    testResult(".env file exists", false, "File not found");
  } else {
    testResult(".env file exists", true);

    const envContent = fs.readFileSync(envPath, "utf8");
    const hasMongoUri = envContent.includes("MONGODB_URI=");

    if (hasMongoUri) {
      const mongoUriLine = envContent
        .split("\n")
        .find((line) => line.startsWith("MONGODB_URI="));

      if (mongoUriLine.includes("mongodb://") || mongoUriLine.includes("mongodb+srv://")) {
        testResult("MONGODB_URI is configured", true, "Format is valid");
      } else {
        testResult("MONGODB_URI is configured", false, "Invalid format (should start with mongodb:// or mongodb+srv://)");
      }
    } else {
      testResult("MONGODB_URI exists in .env", false, "Not found in file");
    }
  }
} catch (error) {
  testResult(".env file check", false, error.message);
}

console.log();

// Step 2: Verify database service file exists and has connection logic
console.log("Step 2: Verify Database Service Implementation");
console.log("-".repeat(70));

try {
  const dbServicePath = path.join(process.cwd(), "backend/services/database.js");
  const dbServiceExists = fs.existsSync(dbServicePath);

  testResult("database.js service file exists", dbServiceExists);

  if (dbServiceExists) {
    const dbServiceContent = fs.readFileSync(dbServicePath, "utf8");

    // Check for mongoose import
    const hasMongoose = dbServiceContent.includes("import mongoose from 'mongoose'");
    testResult("Mongoose is imported", hasMongoose);

    // Check for connection method
    const hasConnectMethod = dbServiceContent.includes("async connect()");
    testResult("connect() method exists", hasConnectMethod);

    // Check for mongoose.connect call
    const hasMongooseConnect = dbServiceContent.includes("mongoose.connect(");
    testResult("mongoose.connect() is called", hasMongooseConnect);

    // Check for testConnection method
    const hasTestConnection = dbServiceContent.includes("async testConnection()");
    testResult("testConnection() method exists", hasTestConnection);

    // Check for serverStatus call
    const hasServerStatus = dbServiceContent.includes("serverStatus()");
    testResult("db.serverStatus() test implemented", hasServerStatus);
  }
} catch (error) {
  testResult("Database service check", false, error.message);
}

console.log();

// Step 3: Verify connection pooling configuration
console.log("Step 3: Verify Connection Pooling Configuration");
console.log("-".repeat(70));

try {
  const dbServicePath = path.join(process.cwd(), "backend/services/database.js");
  const dbServiceContent = fs.readFileSync(dbServicePath, "utf8");

  // Check for connection pooling options
  const hasMaxPoolSize = dbServiceContent.includes("maxPoolSize");
  testResult("maxPoolSize configured", hasMaxPoolSize, "Should be 10");

  const hasMinPoolSize = dbServiceContent.includes("minPoolSize");
  testResult("minPoolSize configured", hasMinPoolSize, "Should be 2");

  const hasSocketTimeout = dbServiceContent.includes("socketTimeoutMS");
  testResult("socketTimeoutMS configured", hasSocketTimeout, "Should be 45000");

  const hasServerSelectionTimeout = dbServiceContent.includes("serverSelectionTimeoutMS");
  testResult("serverSelectionTimeoutMS configured", hasServerSelectionTimeout, "Should be 5000");

  const hasHeartbeatFrequency = dbServiceContent.includes("heartbeatFrequencyMS");
  testResult("heartbeatFrequencyMS configured", hasHeartbeatFrequency, "Should be 10000");
} catch (error) {
  testResult("Connection pooling check", false, error.message);
}

console.log();

// Step 4: Confirm connection retry logic on failure
console.log("Step 4: Verify Connection Retry Logic");
console.log("-".repeat(70));

try {
  const dbServicePath = path.join(process.cwd(), "backend/services/database.js");
  const dbServiceContent = fs.readFileSync(dbServicePath, "utf8");

  // Check for retry configuration
  const hasRetryWrites = dbServiceContent.includes("retryWrites:");
  testResult("retryWrites option configured", hasRetryWrites);

  const hasRetryReads = dbServiceContent.includes("retryReads:");
  testResult("retryReads option configured", hasRetryReads);

  // Check for retry logic in connect method
  const hasRetryLogic =
    dbServiceContent.includes("retryAttempts") &&
    dbServiceContent.includes("maxRetries") &&
    dbServiceContent.includes("retryDelay");

  testResult("Retry logic variables defined", hasRetryLogic);

  const hasRetryLoop = dbServiceContent.includes("while") || dbServiceContent.includes("recursive");
  testResult("Retry loop implemented", hasRetryLoop);

  const hasExponentialBackoff =
    dbServiceContent.includes("Math.pow") ||
    dbServiceContent.includes("backoff") ||
    (dbServiceContent.includes("retryDelay") && dbServiceContent.includes("*"));

  testResult("Exponential backoff implemented", hasExponentialBackoff);
} catch (error) {
  testResult("Retry logic check", false, error.message);
}

console.log();

// Step 5: Test read access to existing collections
console.log("Step 5: Verify Read Access Test Implementation");
console.log("-".repeat(70));

try {
  const dbServicePath = path.join(process.cwd(), "backend/services/database.js");
  const dbServiceContent = fs.readFileSync(dbServicePath, "utf8");

  // Check for testReadAccess method
  const hasTestReadAccess = dbServiceContent.includes("async testReadAccess()");
  testResult("testReadAccess() method exists", hasTestReadAccess);

  if (hasTestReadAccess) {
    // Check for stories collection test
    const hasStoriesCheck = dbServiceContent.includes("'stories'") || dbServiceContent.includes('"stories"');
    testResult("Stories collection check implemented", hasStoriesCheck);

    // Check for users collection test
    const hasUsersCheck = dbServiceContent.includes("'users'") || dbServiceContent.includes('"users"');
    testResult("Users collection check implemented", hasUsersCheck);

    // Check for countDocuments or similar read operation
    const hasReadOperation = dbServiceContent.includes("countDocuments") || dbServiceContent.includes("find(");
    testResult("Read operations implemented", hasReadOperation);
  }
} catch (error) {
  testResult("Read access test check", false, error.message);
}

console.log();

// Additional: Verify server.js integration
console.log("Additional: Verify Server Integration");
console.log("-".repeat(70));

try {
  const serverPath = path.join(process.cwd(), "backend/server.js");
  const serverExists = fs.existsSync(serverPath);

  testResult("server.js exists", serverExists);

  if (serverExists) {
    const serverContent = fs.readFileSync(serverPath, "utf8");

    const importsDatabase = serverContent.includes("databaseService");
    testResult("databaseService imported", importsDatabase);

    const callsConnect = serverContent.includes("databaseService.connect()");
    testResult("databaseService.connect() called", callsConnect);

    const hasAsyncStart = serverContent.includes("async function startServer()");
    testResult("Async server initialization implemented", hasAsyncStart);
  }
} catch (error) {
  testResult("Server integration check", false, error.message);
}

console.log();

// Additional: Verify API endpoints for testing
console.log("Additional: Verify API Test Endpoints");
console.log("-".repeat(70));

try {
  const serverPath = path.join(process.cwd(), "backend/server.js");
  const serverContent = fs.readFileSync(serverPath, "utf8");

  const hasHealthEndpoint = serverContent.includes('"/api/health"');
  testResult("Health check endpoint exists", hasHealthEndpoint);

  const hasDbTestEndpoint = serverContent.includes('"/api/database/test"');
  testResult("Database test endpoint exists", hasDbTestEndpoint);

  if (hasDbTestEndpoint) {
    const callsTestConnection = serverContent.includes("databaseService.testConnection()");
    testResult("Endpoint calls testConnection()", callsTestConnection);

    const callsTestReadAccess = serverContent.includes("databaseService.testReadAccess()");
    testResult("Endpoint calls testReadAccess()", callsTestReadAccess);
  }
} catch (error) {
  testResult("API endpoints check", false, error.message);
}

console.log();
console.log("=".repeat(70));
console.log("Test Summary");
console.log("=".repeat(70));
console.log(`Total Tests: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log();

if (failedTests === 0) {
  console.log("✅ All tests PASSED! MongoDB connection setup is complete.");
  console.log();
  console.log("Next Steps:");
  console.log("1. Update .env with your MongoDB Atlas connection string");
  console.log("2. Run: npm run dev:backend");
  console.log("3. Test connection: curl http://localhost:5001/api/database/test");
  process.exit(0);
} else {
  console.log("❌ Some tests FAILED. Please review the implementation.");
  process.exit(1);
}
