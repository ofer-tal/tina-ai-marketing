import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try loading from different locations
config({ path: join(__dirname, '../../.env') });
config({ path: join(__dirname, '../.env') });

console.log('MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI:', process.env.MONGODB_URI?.substring(0, 50) + '...');
