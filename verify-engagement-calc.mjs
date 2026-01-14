// Verify engagement rate calculation
const views = 15234;
const likes = 1845;
const comments = 92;
const shares = 138;

const expectedRate = ((likes + comments + shares) / views) * 100;
console.log('Views:', views);
console.log('Likes:', likes);
console.log('Comments:', comments);
console.log('Shares:', shares);
console.log('Engagement = (likes + comments + shares) / views * 100');
console.log(`Engagement = (${likes} + ${comments} + ${shares}) / ${views} * 100`);
console.log(`Engagement = ${likes + comments + shares} / ${views} * 100`);
console.log(`Engagement = ${(likes + comments + shares) / views} * 100`);
console.log(`Engagement = ${expectedRate.toFixed(4)}%`);
