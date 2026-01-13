import fs from "fs";

const content = `import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import databaseService from "./services/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = databaseService.getStatus();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        connected: dbStatus.isConnected,
        readyState: dbStatus.readyState,
        name: dbStatus.name,
        host: dbStatus.host
      }
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/database/test", async (req, res) => {
  try {
    await databaseService.testConnection();
    await databaseService.testReadAccess();
    res.json({
      status: "success",
      message: "Database connection and access test passed",
      database: databaseService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Database test failed", error: error.message });
  }
});

app.get("/api", (req, res) => {
  res.json({
    name: "Blush Marketing Operations Center API",
    version: "1.0.0",
    status: "running",
    database: databaseService.getStatus()
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ error: { message: err.message || "Internal server error", status: err.status || 500 } });
});

app.use((req, res) => {
  res.status(404).json({ error: { message: "Route not found", status: 404 } });
});

async function startServer() {
  try {
    console.log("Connecting to MongoDB...");
    await databaseService.connect();
    console.log("MongoDB connection established");
    app.listen(PORT, () => {
      console.log("Blush Marketing Operations Center API Server running on port " + PORT);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  await databaseService.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await databaseService.disconnect();
  process.exit(0);
});

startServer();

export default app;
`;

fs.writeFileSync("backend/server.js", content);
console.log("File updated successfully");
