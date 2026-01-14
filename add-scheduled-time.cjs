const fs = require('fs');

const filePath = 'C:/Projects/blush-marketing/frontend/src/pages/ContentLibrary.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const insertAfter = `const NoHistoryMessage = styled.div\`
  text-align: center;
  padding: 1.5rem;
  color: #6c757d;
  font-style: italic;
\`;

`;

const insertBefore = `const VideoContainer = styled.div\``;

const styledComponents = `

// Scheduled Time Display Components
const ScheduledTimeSection = styled.div\`
  background: linear-gradient(135deg, #1a1a3e 0%, #16213e 100%);
  border: 2px solid #7b2cbf;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
\`;

const ScheduledTimeInfo = styled.div\`
  flex: 1;
  min-width: 200px;
\`;

const ScheduledTimeHeader = styled.div\`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
\`;

const ScheduledTimeDisplay = styled.div\`
  font-size: 1.5rem;
  font-weight: 700;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
\`;

const CountdownTimer = styled.div\`
  font-size: 1.1rem;
  color: #00d26a;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
\`;

const TimezoneDisplay = styled.div\`
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.25rem;
\`;

const RescheduleButton = styled.button\`
  padding: 0.6rem 1.2rem;
  background: #7b2cbf;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #9d4edd;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 44, 191, 0.3);
  }

  &:disabled {
    background: #2d3561;
    cursor: not-allowed;
    opacity: 0.5;
  }
\`;

const DateTimePickerContainer = styled.div\`
  margin-top: 1rem;
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #2d3561;
  display: \${props => props.$visible ? 'block' : 'none'};
\`;

const DateTimePickerRow = styled.div\`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
\`;

const DateTimeInput = styled.input\`
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #7b2cbf;
    box-shadow: 0 0 0 3px rgba(123, 44, 191, 0.1);
  }
\`;

const ConfirmRescheduleButton = styled.button\`
  padding: 0.6rem 1.2rem;
  background: #00d26a;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #00b35d;
  }
\`;

const CancelRescheduleButton = styled.button\`
  padding: 0.6rem 1.2rem;
  background: #ff6b6b;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ff5252;
  }
\`;

`;

const marker = `${insertAfter}${insertBefore}`;

if (content.includes(marker)) {
  const newContent = content.replace(marker, `${insertAfter}${styledComponents}${insertBefore}`);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Styled components added successfully');
} else {
  console.log('❌ Marker not found - file may have been modified');
  console.log('Looking for:', marker.substring(0, 100));
}
