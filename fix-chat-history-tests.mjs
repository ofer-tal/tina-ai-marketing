import fs from 'fs';

const content = fs.readFileSync('backend/tests/chat-integration-live.test.js', 'utf8');
const fixed = content
  .replace(/response\.body\.data/g, 'response.body.conversations')
  .replace(/Array\.isArray\(response\.body\.conversations\)\)\.toBe\(true\);/g, 'Array.isArray(response.body.conversations)).toBe(true);');

fs.writeFileSync('backend/tests/chat-integration-live.test.js', fixed);
console.log('Fixed chat history tests - replaced response.body.data with response.body.conversations');
