import Database from 'better-sqlite3';

const db = new Database('./features.db', { readonly: true });

// Get the next pending feature
const nextFeature = db.prepare(`
  SELECT id, name, category, description, steps, status
  FROM features
  WHERE status != 'passing'
  ORDER BY id ASC
  LIMIT 1
`).get();

if (nextFeature) {
  console.log('NEXT PENDING FEATURE:');
  console.log('ID:', nextFeature.id);
  console.log('Name:', nextFeature.name);
  console.log('Category:', nextFeature.category);
  console.log('Status:', nextFeature.status);
  console.log('Description:', nextFeature.description ? nextFeature.description.substring(0, 200) + '...' : 'N/A');

  const steps = JSON.parse(nextFeature.steps || '[]');
  console.log('Steps:', steps.length);
  console.log('\nTest Steps:');
  steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
} else {
  console.log('No pending features found');
}

// Also get stats
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'passing' THEN 1 ELSE 0 END) as passing,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
  FROM features
`).get();

console.log('\nFEATURE STATS:');
console.log(`Total: ${stats.total}`);
console.log(`Passing: ${stats.passing}`);
console.log(`In Progress: ${stats.in_progress}`);
console.log(`Pending: ${stats.pending}`);

db.close();
