/**
 * Vitest Setup File
 *
 * Loads environment variables before running tests
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

console.log('✅ Environment variables loaded');
