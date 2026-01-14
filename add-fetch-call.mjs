import fs from 'fs';

// Read the file
const content = fs.readFileSync('frontend/src/pages/StrategicDashboard.jsx', 'utf8');

// Add fetchSuggestionsData call after fetchCompetitivenessData
const updated = content.replace(
  '    fetchCompetitivenessData();\n  }, [dateRange]);',
  '    fetchCompetitivenessData();\n    fetchSuggestionsData();\n  }, [dateRange]);'
);

fs.writeFileSync('frontend/src/pages/StrategicDashboard.jsx', updated);
console.log('Added fetchSuggestionsData call');
