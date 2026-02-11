// Test Instagram Reels Matcher with multi-platform support
(async () => {
  const { default: job } = await import('../jobs/instagramReelsMatcher.js');
  console.log('Triggering Instagram Reels Matcher Job...');
  const result = await job.trigger();
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
