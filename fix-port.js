import { readFile, writeFile } from 'fs/promises';

const files = [
  'frontend/src/components/TikTokSandboxConfig.jsx',
  'frontend/src/components/TodoSidebar.jsx',
  'frontend/src/components/MonthlyRevenue.jsx',
  'frontend/src/pages/Campaigns.jsx',
  'frontend/src/pages/Chat.jsx',
  'frontend/src/pages/ContentLibrary.jsx',
  'frontend/src/pages/RevenueAttributionTest.jsx',
  'frontend/src/pages/StrategicDashboard.jsx'
];

console.log('Updating API port from 3003 to 3001...');

for (const file of files) {
  try {
    const content = await readFile(file, 'utf-8');
    const updated = content.replace(/localhost:3003/g, 'localhost:3001');
    await writeFile(file, updated, 'utf-8');
    console.log(`✓ Updated ${file}`);
  } catch (err) {
    console.error(`✗ Error updating ${file}:`, err.message);
  }
}

console.log('\nDone! Port updated from 3003 to 3001');
