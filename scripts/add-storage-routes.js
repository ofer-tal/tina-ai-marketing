import fs from 'fs';

const serverPath = 'backend/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Add storage router import after settings router import
content = content.replace(
  "import settingsRouter from \"./api/settings.js\";",
  `import settingsRouter from "./api/settings.js";
import storageRouter from "./api/storage.js";
import storageService from "./services/storage.js";`
);

// Add storage routes after settings routes
content = content.replace(
  "app.use(\"/api/settings\", settingsRouter);",
  `app.use("/api/settings", settingsRouter);
app.use("/api/storage", storageRouter);`
);

// Add storage initialization after database connection
// Find the database connection section and add after it
content = content.replace(
  /(\/\/ Start server[\s\S]*?app\.listen\(PORT)/,
  `// Initialize storage service
storageService.initialize().catch(err => {
  console.error('Failed to initialize storage service:', err);
});

$1`
);

fs.writeFileSync(serverPath, content);
console.log('Storage routes added to server.js');
