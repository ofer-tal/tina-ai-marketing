import fs from 'fs';

// Read the file
const content = fs.readFileSync('frontend/src/pages/StrategicDashboard.jsx', 'utf8');

// Add fetchSuggestionsData function after fetchCompetitivenessData
const newFunction = `
  const fetchSuggestionsData = async () => {
    try {
      const response = await fetch('/api/aso/suggestions');

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const result = await response.json();
      setSuggestionsData(result.data);
    } catch (err) {
      console.error('Failed to fetch keyword suggestions:', err);
    }
  };
`;

const updated = content.replace(
  '  };\n\n  const generateMockFunnelData',
  `  };${newFunction}\n  const generateMockFunnelData`
);

fs.writeFileSync('frontend/src/pages/StrategicDashboard.jsx', updated);
console.log('Added fetchSuggestionsData function');
