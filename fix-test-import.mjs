import fs from 'fs';

const testPath = 'test-feature-116-metrics.mjs';
let content = fs.readFileSync(testPath, 'utf8');

// Add dotenv import at the beginning
content = content.replace(
  "/**\n * Test script for Feature",
  "import dotenv from 'dotenv';\ndotenv.config();\n\n/**\n * Test script for Feature"
);

fs.writeFileSync(testPath, content);
console.log('Added dotenv import to test script');
