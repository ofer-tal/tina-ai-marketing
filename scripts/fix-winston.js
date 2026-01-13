import fs from "fs";

let content = fs.readFileSync("backend/services/database.js", "utf8");

// Fix Winston console transport for ES modules
content = content.replace(
  /logger\.add\(new winston\.transports\.console\(/g,
  `logger.add(new winston.transports.Console(`
);

// Also capitalize File
content = content.replace(
  /new winston\.transports\.File\(/g,
  `new winston.transports.File(`
);

fs.writeFileSync("backend/services/database.js", content);
console.log("Winston transports fixed");
