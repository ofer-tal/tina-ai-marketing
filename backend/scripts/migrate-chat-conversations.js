#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('╔═════════════════════════════════════════════════╗');
console.log('║  MongoDB Collection Migration Tool                         ║');
console.log('║ chat_conversations → marketing_chat_conversations     ║');
console.log('╚═════════════════════════════════════════════════╝\n');

const SCRIPT_PATH = path.join(__dirname, 'migrate-chat-conversations.js');
const MIGRATED_BACKUP = path.join(__dirname, '../backups/mongodb');

console.log('📂 Script:', SCRIPT_PATH);
console.log('💾 Backup:', MIGRATED_BACKUP);
console.log('');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

if (command === 'dry-run' || command === 'dry') {
  console.log('\n🔍 DRY RUN MODE - No changes will be made to MongoDB\n');
  execSync('node ' + SCRIPT_PATH, { stdio: 'inherit' });
  process.exit(0);
}

if (command === 'run' || command === 'migrate') {
  console.log('\n🚀 RUNNING MIGATION...\n');
  execSync('node ' + SCRIPT_PATH, { stdio: 'inherit' });
} else if (command === 'help') {
  console.log('\n📖 Commands:');
  console.log('  node run-migration.js run    - Run migration (production)');
  console.log('  node run-migration.js dry-run  - Preview changes without modifying');
  console.log('  node run-migration.js rollback    - Rollback to backup (WARNING: replaces new collection with old backup)');
  process.exit(0);
} else {
  console.log('\n❌ Unknown command:', command);
  console.log('Use "help" to see available commands');
  process.exit(1);
}
