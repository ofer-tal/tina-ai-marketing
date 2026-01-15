import fs from 'fs';

const content = fs.readFileSync('backend/tests/chat-integration.test.js', 'utf8');
const fixed = content.replace(/response\.body\.data\./g, 'response.body.response.');
fs.writeFileSync('backend/tests/chat-integration.test.js', fixed);
console.log('Fixed response structure - replaced response.body.data with response.body.response');
