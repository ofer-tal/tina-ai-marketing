import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('Page loaded!');

  // Wait a bit for React to mount
  await page.waitForTimeout(3000);

  // Check for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser error:', msg.text());
    }
  });

  // Take a screenshot
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('Screenshot saved to test-screenshot.png');

  // Get page title
  const title = await page.title();
  console.log('Page title:', title);

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await browser.close();
}
