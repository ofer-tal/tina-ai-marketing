import fs from 'fs';

const filePath = 'C:/Projects/blush-marketing/backend/server.js';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Check if budgetGuardRouter is already imported
if (content.includes('import budgetGuardRouter')) {
  console.log('budgetGuardRouter already imported');
  process.exit(0);
}

// Add the import after searchAdsRouter
content = content.replace(
  'import searchAdsRouter from "./api/searchAds.js";\nimport revenueRouter',
  'import searchAdsRouter from "./api/searchAds.js";\nimport budgetGuardRouter from "./api/budgetGuard.js";\nimport revenueRouter'
);

// Add the route
content = content.replace(
  'app.use("/api/searchAds", searchAdsRouter);\napp.use("/api/revenue", revenueRouter);',
  'app.use("/api/searchAds", searchAdsRouter);\napp.use("/api/budget-guard", budgetGuardRouter);\napp.use("/api/revenue", revenueRouter);'
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ budgetGuardRouter import and route added');
