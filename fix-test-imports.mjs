import fs from 'fs';

const testPath = 'test-ab-test-duration-monitor.js';
let content = fs.readFileSync(testPath, 'utf8');

// Fix all destructuring imports
content = content.replace(
  /const \{ abTestDurationMonitor \} = await import\('\.\/backend\/jobs\/abTestDurationMonitor\.js'\);/g,
  'const abTestDurationMonitorModule = await import(\'./backend/jobs/abTestDurationMonitor.js\');\n    const abTestDurationMonitor = abTestDurationMonitorModule.default;'
);

fs.writeFileSync(testPath, content, 'utf8');
console.log('✅ Fixed import statements in test file');
