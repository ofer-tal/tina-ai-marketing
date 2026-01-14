import fs from 'fs';

// Read the file
const content = fs.readFileSync('frontend/src/pages/StrategicDashboard.jsx', 'utf8');

// Add styled components for suggestions before function StrategicDashboard
const styledComponents = `
// ASO Keyword Suggestions Styled Components
const SuggestionsHeader = styled.div\`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
\`;

const SuggestionsTitle = styled.h3\`
  font-size: 1.1rem;
  color: #eaeaea;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
\`;

const SuggestionsCount = styled.span\`
  background: #7b2cbf;
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
\`;

const SuggestionsGrid = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
\`;

const SuggestionCard = styled.div\`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: #7b2cbf;
    box-shadow: 0 4px 20px rgba(123, 44, 191, 0.15);
    transform: translateY(-2px);
  }
\`;

const SuggestionKeyword = styled.div\`
  font-size: 1.1rem;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 0.5rem;
\`;

const SuggestionCategory = styled.div\`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
  background: \${props => {
    switch (props.\$category) {
      case 'romance': return 'rgba(233, 69, 96, 0.2)';
      case 'stories': return 'rgba(123, 44, 191, 0.2)';
      case 'spicy': return 'rgba(255, 107, 157, 0.2)';
      case 'games': return 'rgba(0, 210, 106, 0.2)';
      default: return 'rgba(160, 160, 160, 0.2)';
    }
  }};
  color: \${props => {
    switch (props.\$category) {
      case 'romance': return '#e94560';
      case 'stories': return '#7b2cbf';
      case 'spicy': return '#ff6b9d';
      case 'games': return '#00d26a';
      default: return '#a0a0a0';
    }
  }};
\`;

const SuggestionReason = styled.div\`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 1rem;
  line-height: 1.4;
\`;

const SuggestionMetrics = styled.div\`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
\`;

const SuggestionMetric = styled.div\`
  text-align: center;
  padding: 0.5rem;
  background: #16213e;
  border-radius: 6px;
\`;

const SuggestionMetricLabel = styled.div\`
  font-size: 0.7rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
\`;

const SuggestionMetricValue = styled.div\`
  font-size: 0.95rem;
  font-weight: 600;
  color: \${props => props.\$positive ? '#00d26a' : props.\$negative ? '#f94144' : '#eaeaea'};
\`;

const AddKeywordButton = styled.button\`
  background: linear-gradient(135deg, #7b2cbf 0%, #e94560 100%);
  border: none;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  margin-top: 0.75rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 44, 191, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
\`;

const NoSuggestions = styled.div\`
  text-align: center;
  padding: 3rem;
  color: #a0a0a0;
  font-size: 0.95rem;
\`;

`;

const updated = content.replace(
  ';\n\nfunction StrategicDashboard() {',
  `;\n${styledComponents}\n\nfunction StrategicDashboard() {`
);

fs.writeFileSync('frontend/src/pages/StrategicDashboard.jsx', updated);
console.log('Added suggestions styled components');
