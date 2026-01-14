import dotenv from 'dotenv';
dotenv.config();

console.log('APP_STORE_CONNECT_ISSUER_ID:', process.env.APP_STORE_CONNECT_ISSUER_ID || 'NOT SET');
console.log('Value exists:', !!process.env.APP_STORE_CONNECT_ISSUER_ID);
process.exit(0);
