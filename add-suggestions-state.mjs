import fs from 'fs';

// Read the file
const content = fs.readFileSync('frontend/src/pages/StrategicDashboard.jsx', 'utf8');
const lines = content.split('\n');

// Find line with competitivenessData and insert suggestionsData after it
const insertIndex = lines.findIndex(line =>
  line.includes('const [competitivenessData, setCompetitivenessData] = useState(null)')
);

if (insertIndex !== -1) {
  lines.splice(insertIndex + 1, 0, '  const [suggestionsData, setSuggestionsData] = useState(null);');
  fs.writeFileSync('frontend/src/pages/StrategicDashboard.jsx', lines.join('\n'));
  console.log(`Added suggestions state at line ${insertIndex + 2}`);
} else {
  console.log('Could not find competitivenessData line');
}
