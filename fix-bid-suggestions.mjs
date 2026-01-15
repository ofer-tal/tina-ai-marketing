import fs from 'fs';

const file = 'C:/Projects/blush-marketing/frontend/src/pages/Campaigns.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the problematic suggestion.reason assignments with proper template literals
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  // Fix line 1731 and similar patterns
  if (lines[i].includes('suggestion.reason =(') && lines[i].includes('roi.toFixed(1)')) {
    // Extract the indentation
    const indent = lines[i].match(/^\s*/)[0];

    // Replace with proper template literal based on context
    if (lines[i].includes('Excellent performance')) {
      lines[i] = `${indent}suggestion.reason = \`Excellent performance: High ROI (+\${roi.toFixed(1)}%), low CPA ($\${cpa.toFixed(2)}), high CTR (\${ctr.toFixed(2)}%)\`;`;
    } else if (lines[i].includes('Good performance')) {
      lines[i] = `${indent}const reasonPart = metrics.lowCPA ? 'low CPA' : metrics.highCTR ? 'high CTR' : 'high conversion rate';`;
      // Insert new line after for the actual reason assignment
      lines.splice(i + 1, 0, `${indent}        suggestion.reason = \`Good performance: Positive ROI (+\${roi.toFixed(1)}%), \${reasonPart}\`;`);
    } else if (lines[i].includes('Poor performance')) {
      lines[i] = `${indent}suggestion.reason = \`Poor performance: Very negative ROI (\${roi.toFixed(1)}%), very high CPA ($\${cpa.toFixed(2)})\`;`;
    } else if (lines[i].includes('Underperforming')) {
      lines[i] = `${indent}const roiOrCpa = metrics.negativeROI ? 'Negative ROI' : 'High CPA';`;
      lines.splice(i + 1, 0, `${indent}        suggestion.reason = \`Underperforming: \${roiOrCpa}, low CTR (\${ctr.toFixed(2)}%)\`;`);
    } else if (lines[i].includes('Concerning')) {
      lines[i] = `${indent}suggestion.reason = metrics.negativeROI`;
      lines.splice(i + 1, 0, `${indent}          ? \`Concerning: Negative ROI (\${roi.toFixed(1)}%)\``);
      lines.splice(i + 2, 0, `${indent}          : \`Concerning: Very high CPA ($\${cpa.toFixed(2)})\`;`);
    } else if (lines[i].includes('Performance is acceptable')) {
      lines[i] = `${indent}suggestion.reason = \`Performance is acceptable: ROI \${roi.toFixed(1)}%, CPA $\${cpa.toFixed(2)}\`;`;
    }
  }
}

content = lines.join('\n');
fs.writeFileSync(file, content);
console.log('Fixed bid suggestions syntax errors');
