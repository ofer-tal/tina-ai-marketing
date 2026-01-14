import fs from 'fs';

const serverPath = 'backend/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Add import after audio-overlay import
content = content.replace(
  "import audioOverlayRouter from \"./api/audio-overlay.js\";\nimport storageService",
  "import audioOverlayRouter from \"./api/audio-overlay.js\";\nimport metricsRouter from \"./api/metrics.js\";\nimport storageService"
);

// Add router registration after audio-overlay registration
content = content.replace(
  "app.use(\"/api/audio-overlay\", audioOverlayRouter);",
  "app.use(\"/api/audio-overlay\", audioOverlayRouter);\napp.use(\"/api/metrics\", metricsRouter);"
);

fs.writeFileSync(serverPath, content);
console.log('Metrics router import and registration added');
