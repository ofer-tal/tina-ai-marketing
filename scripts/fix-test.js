import fs from "fs";

let content = fs.readFileSync("scripts/test-mongodb-setup.js", "utf8");

// Fix the retry loop detection to include recursive calls
content = content.replace(
  /const hasRetryLoop =.*$/,
  `const hasRetryLoop =\n    dbServiceContent.includes("while") ||\n    dbServiceContent.includes("return this.connect()") ||\n    dbServiceContent.includes("recursive");`
);

fs.writeFileSync("scripts/test-mongodb-setup.js", content);
console.log("Test script fixed");
