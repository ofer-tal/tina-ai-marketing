import fs from 'fs';

const filePath = 'frontend/src/App.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Add import
content = content.replace(
  "import Campaigns from './pages/Campaigns';",
  "import Campaigns from './pages/Campaigns';\nimport RevenueAttributionTest from './pages/RevenueAttributionTest';"
);

// Add route
content = content.replace(
  '<Route path="/ads/campaigns" element={<Campaigns />} />',
  '<Route path="/ads/campaigns" element={<Campaigns />} />\n                <Route path="/ads/revenue-test" element={<RevenueAttributionTest />} />'
);

// Add sidebar link
content = content.replace(
  '<SidebarNavLink to="/ads/campaigns">📢 Campaigns</SidebarNavLink>',
  '<SidebarNavLink to="/ads/campaigns">📢 Campaigns</SidebarNavLink>\n            <SidebarNavLink to="/ads/revenue-test">💰 Revenue</SidebarNavLink>'
);

fs.writeFileSync(filePath, content);
console.log('✅ Added revenue test route to App.jsx');
