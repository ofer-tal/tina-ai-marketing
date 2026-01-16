/**
 * SEO Keyword Recommendations Page
 * Feature #273: SEO keyword recommendations
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #999;
`;

const Card = styled.div`
  background: #1e1e2e;
  border: 1px solid #3e3e4e;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
`;

const InputSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #999;
  margin-bottom: 6px;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #3e3e4e;
  border-radius: 6px;
  background: #12121a;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #3e3e4e;
  border-radius: 6px;
  background: #12121a;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #6366f1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #4f46e5;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonSecondary = styled(Button)`
  background: #3e3e4e;

  &:hover {
    background: #4e4e5e;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const SummaryCard = styled.div`
  background: #1e1e2e;
  border: 1px solid #3e3e4e;
  border-radius: 8px;
  padding: 16px;
`;

const SummaryCardLabel = styled.div`
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
`;

const SummaryCardValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #6366f1;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #3e3e4e;
`;

const Tab = styled.button`
  padding: 10px 16px;
  border: none;
  background: none;
  color: ${props => props.$active ? '#6366f1' : '#999'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#6366f1' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    color: #6366f1;
  }
`;

const KeywordTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #999;
  border-bottom: 1px solid #3e3e4e;
`;

const TableCell = styled.td`
  padding: 12px;
  font-size: 13px;
  color: #fff;
  border-bottom: 1px solid #3e3e4e;
`;

const TableRow = styled.tr`
  &:hover {
    background: #2a2a3e;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => {
    switch (props.$variant) {
      case 'success': return '#10b98133';
      case 'warning': return '#f59e0b33';
      case 'danger': return '#ef444433';
      default: return '#99933';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      default: return '#999';
    }
  }};
`;

const DifficultyBar = styled.div`
  width: 100px;
  height: 6px;
  background: #3e3e4e;
  border-radius: 3px;
  overflow: hidden;
`;

const DifficultyFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.$value < 30) return '#10b981';
    if (props.$value < 60) return '#f59e0b';
    return '#ef4444';
  }};
  width: ${props => props.$value}%;
  transition: width 0.3s;
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #999;
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: #ef444419;
  border: 1px solid #ef44444d;
  border-radius: 8px;
  color: #ef4444;
  margin-bottom: 16px;
`;

const GuidanceSection = styled.div`
  margin-top: 16px;
`;

const GuidanceItem = styled.div`
  padding: 12px;
  background: #1e1e2e;
  border-left: 3px solid #6366f1;
  margin-bottom: 8px;
  border-radius: 0 6px 6px 0;
`;

const GuidanceTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  margin-bottom: 4px;
`;

const GuidanceText = styled.div`
  font-size: 13px;
  color: #999;
`;

const Checklist = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
`;

const ChecklistItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #2a2a3e;
  }
`;

const Checkbox = styled.input`
  cursor: pointer;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;
`;

const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

function KeywordRecommendations() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('general');
  const [contentType, setContentType] = useState('blog');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('quick-wins');
  const [checklist, setChecklist] = useState({});

  useEffect(() => {
    // Load previous search from localStorage
    const savedTopic = localStorage.getItem('keyword-recommendations-topic');
    const savedData = localStorage.getItem('keyword-recommendations-data');
    const savedChecklist = localStorage.getItem('keyword-recommendations-checklist');

    if (savedTopic) setTopic(savedTopic);
    if (savedData) setData(JSON.parse(savedData));
    if (savedChecklist) setChecklist(JSON.parse(savedChecklist));
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/keyword-recommendations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          audience,
          contentType
        })
      });

      const result = await response.json();

      if (result.success) {
        setData(result);
        localStorage.setItem('keyword-recommendations-topic', topic);
        localStorage.setItem('keyword-recommendations-data', JSON.stringify(result));

        // Initialize checklist from usage guidance
        if (result.usageGuidance?.checklist) {
          const initialChecklist = {};
          result.usageGuidance.checklist.forEach((item, index) => {
            initialChecklist[index] = false;
          });
          setChecklist(initialChecklist);
          localStorage.setItem('keyword-recommendations-checklist', JSON.stringify(initialChecklist));
        }
      } else {
        setError(result.error || 'Failed to generate keyword recommendations');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = (index) => {
    const newChecklist = { ...checklist, [index]: !checklist[index] };
    setChecklist(newChecklist);
    localStorage.setItem('keyword-recommendations-checklist', JSON.stringify(newChecklist));
  };

  const renderSummaryCards = () => {
    if (!data?.keywordList) return null;

    const summary = data.keywordList.summary;

    return (
      <SummaryCards>
        <SummaryCard>
          <SummaryCardLabel>Total Keywords</SummaryCardLabel>
          <SummaryCardValue>{summary.totalKeywords}</SummaryCardValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryCardLabel>Quick Wins</SummaryCardLabel>
          <SummaryCardValue>{summary.totalQuickWins}</SummaryCardValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryCardLabel>High Value</SummaryCardLabel>
          <SummaryCardValue>{summary.totalHighValue}</SummaryCardValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryCardLabel>Avg Difficulty</SummaryCardLabel>
          <SummaryCardValue>{Math.round(summary.avgDifficulty)}</SummaryCardValue>
        </SummaryCard>
      </SummaryCards>
    );
  };

  const renderKeywords = () => {
    if (!data?.keywordList) return null;

    let keywords = [];

    switch (activeTab) {
      case 'quick-wins':
        keywords = data.keywordList.quickWins || [];
        break;
      case 'opportunities':
        keywords = data.keywordList.topOpportunities || [];
        break;
      case 'all':
        keywords = data.keywordList.keywordList || [];
        break;
      case 'by-intent':
        keywords = Object.values(data.keywordList.groupedByByIntent || {}).flat();
        break;
      default:
        keywords = [];
    }

    if (keywords.length === 0) {
      return (
        <EmptyState>
          <EmptyStateIcon>🔍</EmptyStateIcon>
          <div>No keywords found for this category</div>
        </EmptyState>
      );
    }

    return (
      <KeywordTable>
        <Table>
          <thead>
            <tr>
              <TableHeader>Keyword</TableHeader>
              <TableHeader>Search Volume</TableHeader>
              <TableHeader>Difficulty</TableHeader>
              <TableHeader>Opportunity</TableHeader>
              <TableHeader>Intent</TableHeader>
              <TableHeader>Quick Win</TableHeader>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw, index) => (
              <TableRow key={index}>
                <TableCell>
                  <strong>{kw.keyword}</strong>
                </TableCell>
                <TableCell>
                  {kw.searchVolume?.monthly?.toLocaleString() || 'N/A'}
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DifficultyBar>
                      <DifficultyFill $value={kw.difficulty || 0} />
                    </DifficultyBar>
                    <span>{Math.round(kw.difficulty || 0)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge $variant={kw.opportunityScore > 70 ? 'success' : kw.opportunityScore > 40 ? 'warning' : 'default'}>
                    {Math.round(kw.opportunityScore || 0)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge $variant="default">{kw.intent || 'N/A'}</Badge>
                </TableCell>
                <TableCell>
                  {kw.quickWin ? (
                    <Badge $variant="success">Yes</Badge>
                  ) : (
                    <Badge $variant="default">No</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </KeywordTable>
    );
  };

  const renderUsageGuidance = () => {
    if (!data?.usageGuidance?.guidance) return null;

    const { guidance } = data.usageGuidance;

    return (
      <Card>
        <CardTitle>📝 Usage Guidance</CardTitle>

        <GuidanceSection>
          <GuidanceTitle>Recommended Title</GuidanceTitle>
          <GuidanceText>{guidance.title}</GuidanceText>
        </GuidanceSection>

        <GuidanceSection>
          <GuidanceTitle>Meta Description</GuidanceTitle>
          <GuidanceText>{guidance.metaDescription}</GuidanceText>
        </GuidanceSection>

        <GuidanceSection>
          <GuidanceTitle>Keyword Placement</GuidanceTitle>
          {guidance.keywordPlacement && Object.entries(guidance.keywordPlacement).map(([key, value]) => (
            <GuidanceItem key={key}>
              <GuidanceTitle>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</GuidanceTitle>
              <GuidanceText>{value}</GuidanceText>
            </GuidanceItem>
          ))}
        </GuidanceSection>

        <GuidanceSection>
          <GuidanceTitle>SEO Checklist</GuidanceTitle>
          <Checklist>
            {data.usageGuidance.checklist?.map((item, index) => (
              <ChecklistItem key={index}>
                <Checkbox
                  type="checkbox"
                  checked={checklist[index] || false}
                  onChange={() => handleChecklistChange(index)}
                />
                <span>{item.task}</span>
              </ChecklistItem>
            ))}
          </Checklist>
        </GuidanceSection>
      </Card>
    );
  };

  const renderAudienceInsights = () => {
    if (!data?.audienceAnalysis) return null;

    const { audienceAnalysis } = data;

    return (
      <Card>
        <CardTitle>🎯 Audience Insights</CardTitle>

        <GuidanceSection>
          <GuidanceTitle>Common Questions</GuidanceTitle>
          <ul>
            {audienceAnalysis.commonQuestions?.slice(0, 5).map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </GuidanceSection>

        <GuidanceSection>
          <GuidanceTitle>Pain Points</GuidanceTitle>
          <ul>
            {audienceAnalysis.painPoints?.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </GuidanceSection>

        <GuidanceSection>
          <GuidanceTitle>Interests</GuidanceTitle>
          <div>
            {audienceAnalysis.interests?.map((interest, index) => (
              <Badge key={index} $variant="default" style={{ marginRight: '8px', marginBottom: '8px' }}>
                {interest}
              </Badge>
            ))}
          </div>
        </GuidanceSection>
      </Card>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner>
          <div>Analyzing keywords and generating recommendations...</div>
        </LoadingSpinner>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>🔍 SEO Keyword Recommendations</Title>
        <Subtitle>Get AI-powered keyword recommendations for your content</Subtitle>
      </Header>

      <Card>
        <CardTitle>Generate Recommendations</CardTitle>
        <InputSection>
          <FormGroup>
            <Label>Topic *</Label>
            <Input
              type="text"
              placeholder="e.g., romantic AI stories"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <Label>Target Audience</Label>
            <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="general">General Audience</option>
              <option value="beginners">Beginners</option>
              <option value="intermediate">Intermediate Users</option>
              <option value="advanced">Advanced Users</option>
              <option value="professionals">Professionals</option>
            </Select>
          </FormGroup>
        </InputSection>
        <InputSection>
          <FormGroup>
            <Label>Content Type</Label>
            <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
              <option value="blog">Blog Post</option>
              <option value="tutorial">Tutorial</option>
              <option value="guide">Guide</option>
              <option value="article">Article</option>
            </Select>
          </FormGroup>
        </InputSection>
        <ButtonGroup>
          <Button onClick={handleGenerate}>Generate Recommendations</Button>
          <ButtonSecondary onClick={() => {
            setData(null);
            localStorage.removeItem('keyword-recommendations-data');
          }}>
            Clear
          </ButtonSecondary>
        </ButtonGroup>
      </Card>

      {error && (
        <ErrorMessage>
          <strong>Error:</strong> {error}
        </ErrorMessage>
      )}

      {data && (
        <>
          {renderSummaryCards()}

          <Card>
            <TabContainer>
              <Tab $active={activeTab === 'quick-wins'} onClick={() => setActiveTab('quick-wins')}>
                ⚡ Quick Wins
              </Tab>
              <Tab $active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')}>
                💎 High Value
              </Tab>
              <Tab $active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                📋 All Keywords
              </Tab>
              <Tab $active={activeTab === 'by-intent'} onClick={() => setActiveTab('by-intent')}>
                🎯 By Intent
              </Tab>
            </TabContainer>

            {renderKeywords()}
          </Card>

          {renderUsageGuidance()}
          {renderAudienceInsights()}
        </>
      )}
    </PageContainer>
  );
}

export default KeywordRecommendations;
