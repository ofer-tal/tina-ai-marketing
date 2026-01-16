import channelPerformanceRouter from './backend/api/channel-performance.js';

console.log('Module loaded successfully');
console.log('Router type:', typeof channelPerformanceRouter);
console.log('Router is router:', channelPerformanceRouter && typeof channelPerformanceRouter.stack === 'object');
