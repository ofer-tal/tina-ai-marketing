import fs from "fs";

let content = fs.readFileSync("backend/services/database.js", "utf8");

// Remove deprecated bufferMaxEntries option
content = content.replace(
  /bufferMaxEntries: 0,.*\/\/ Disable mongoose buffering if driver runs out of connections\n/,
  ``
);

fs.writeFileSync("backend/services/database.js", content);
console.log("Mongoose options fixed");
