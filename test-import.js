import('./backend/jobs/apiHealthMonitor.js')
  .then(() => console.log('✅ Import successful'))
  .catch(e => {
    console.error('❌ Import failed:', e.message);
    process.exit(1);
  });
