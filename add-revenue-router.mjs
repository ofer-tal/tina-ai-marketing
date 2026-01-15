import fs from 'fs';

const filePath = 'backend/server.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Add import after searchAdsRouter
content = content.replace(
  'import searchAdsRouter from "./api/searchAds.js";\nimport storageService',
  'import searchAdsRouter from "./api/searchAds.js";\nimport revenueRouter from "./api/revenue.js";\nimport storageService'
);

// Add route after searchAdsRouter
content = content.replace(
  'app.use("/api/searchAds", searchAdsRouter);',
  'app.use("/api/searchAds", searchAdsRouter);\napp.use("/api/revenue", revenueRouter);'
);

fs.writeFileSync(filePath, content);
console.log('✅ Added revenue router to server.js');
