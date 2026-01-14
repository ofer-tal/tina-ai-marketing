import fs from 'fs';

// Read the file
const content = fs.readFileSync('frontend/src/pages/StrategicDashboard.jsx', 'utf-8');

// Replace component names
let newContent = content
  // Replace styled component declarations (lines ~1999+)
  .replace(/^(1999:)(const CompetitorCard = styled\.div`)/m, '$1const CompetitorKeywordCard = styled.div`')
  .replace(/^(2012:)(const CompetitorCardHeader = styled\.div`)/m, '$1const CompetitorKeywordCardHeader = styled.div`')
  .replace(/^(2019:)(const CompetitorName = styled\.h4`)/m, '$1const CompetitorKeywordName = styled.h4`')
  .replace(/^(2025:)(const CompetitorBadge = styled\.span`)/m, '$1const CompetitorKeywordBadge = styled.span`')
  .replace(/^(2038:)(const CompetitorMetric = styled\.div`)/m, '$1const CompetitorKeywordMetric = styled.div`')
  .replace(/^(2049:)(const CompetitorMetricLabel = styled\.span`)/m, '$1const CompetitorKeywordMetricLabel = styled.span`')
  .replace(/^(2054:)(const CompetitorMetricValue = styled\.span`)/m, '$1const CompetitorKeywordMetricValue = styled.span`')

  // Replace JSX usage in the competitor monitoring section only
  .replace(/<CompetitorCard key={index}/g, '<CompetitorKeywordCard key={index')
  .replace(/<\/CompetitorCard>/g, '</CompetitorKeywordCard>')
  .replace(/<CompetitorCardHeader>/g, '<CompetitorKeywordCardHeader>')
  .replace(/<\/CompetitorCardHeader>/g, '</CompetitorKeywordCardHeader>')
  .replace(/\{competitor\.competitorAppName\}<\/CompetitorName>/g, '{competitor.competitorAppName}</CompetitorKeywordName>')
  .replace(/<CompetitorName>\{competitor\.competitorAppName\}/g, '<CompetitorKeywordName>{competitor.competitorAppName}')
  .replace(/<CompetitorBadge priority/g, '<CompetitorKeywordBadge priority')
  .replace(/<\/CompetitorBadge>/g, '</CompetitorKeywordBadge>')
  .replace(/<CompetitorMetric>/g, '<CompetitorKeywordMetric>')
  .replace(/<\/CompetitorMetric>/g, '</CompetitorKeywordMetric>')
  .replace(/<CompetitorMetricLabel>/g, '<CompetitorKeywordMetricLabel>')
  .replace(/<\/CompetitorMetricLabel>/g, '</CompetitorKeywordMetricLabel>')
  .replace(/<CompetitorMetricValue value/g, '<CompetitorKeywordMetricValue value')
  .replace(/<\/CompetitorMetricValue>/g, '</CompetitorKeywordMetricValue>');

// Write back
fs.writeFileSync('frontend/src/pages/StrategicDashboard.jsx', newContent);

console.log('Components renamed successfully!');
