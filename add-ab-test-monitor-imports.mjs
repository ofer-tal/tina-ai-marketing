import fs from 'fs';

const serverPath = 'backend/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Add the router import after keywordRankingCheckRouter
content = content.replace(
  'import keywordRankingCheckRouter from "./api/keywordRankingCheck.js";',
  'import keywordRankingCheckRouter from "./api/keywordRankingCheck.js";\nimport abTestDurationMonitorRouter from "./api/abTestDurationMonitor.js";'
);

// Add the job import after keywordRankingCheckJob
content = content.replace(
  'import keywordRankingCheckJob from "./jobs/keywordRankingCheckJob.js";',
  'import keywordRankingCheckJob from "./jobs/keywordRankingCheckJob.js";\nimport abTestDurationMonitorJob from "./jobs/abTestDurationMonitor.js";'
);

// Register the router
content = content.replace(
  'app.use("/api/keyword-ranking-check", keywordRankingCheckRouter);',
  'app.use("/api/keyword-ranking-check", keywordRankingCheckRouter);\napp.use("/api/ab-test-monitor", abTestDurationMonitorRouter);'
);

// Start the job after MongoDB connection
content = content.replace(
  'keywordRankingCheckJob.start();\n    console.log("Keyword ranking check job started");',
  'keywordRankingCheckJob.start();\n    console.log("Keyword ranking check job started");\n\n    // Start the A/B test duration monitor job\n    abTestDurationMonitorJob.start();\n    console.log("A/B test duration monitor job started");'
);

// Stop the job during graceful shutdown
content = content.replace(
  'keywordRankingCheckJob.stop();\n    console.log(\'  ✓ Scheduler jobs stopped\');',
  'keywordRankingCheckJob.stop();\n    abTestDurationMonitorJob.stop();\n    console.log(\'  ✓ Scheduler jobs stopped\');'
);

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✅ Added A/B test duration monitor imports and registration to server.js');
