import fs from 'fs';

// Read the file
const content = fs.readFileSync('frontend/src/pages/StrategicDashboard.jsx', 'utf8');

// Add handleAddKeyword function after formatNumber
const handleKeywordFunction = `
  const handleAddKeyword = async (suggestion) => {
    try {
      const response = await fetch('/api/aso/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyword: suggestion.keyword,
          volume: suggestion.volume,
          difficulty: suggestion.difficulty,
          competition: suggestion.competition,
          target: true
        })
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const result = await response.json();

      // Refresh suggestions to remove the added keyword
      await fetchSuggestionsData();

      // Refresh competitiveness data to include the new keyword
      await fetchCompetitivenessData();

      // Show success message
      alert(\`Keyword "\${suggestion.keyword}" added to tracking!\`);
    } catch (error) {
      console.error('Failed to add keyword:', error);
      alert(\`Failed to add keyword: \${error.message}\`);
    }
  };
`;

const updated = content.replace(
  '  const formatNumber = (value) => {\n    return new Intl.NumberFormat(\'en-US\').format(value);\n  };',
  `  const formatNumber = (value) => {\n    return new Intl.NumberFormat('en-US').format(value);\n  };${handleKeywordFunction}`
);

fs.writeFileSync('frontend/src/pages/StrategicDashboard.jsx', updated);
console.log('Added handleAddKeyword function');
