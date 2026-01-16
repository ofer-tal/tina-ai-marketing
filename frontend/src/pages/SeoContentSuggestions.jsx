/**
 * SEO Content Suggestions Page
 * Feature #267: SEO optimized content suggestions
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${cssVar('--color-text')};
  margin: 0;
`;

const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
  align-items: start;
`;

const Sidebar = styled.div`
  background: ${cssVar('--color-surface')};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${cssVar('--color-border')};
`;

const SidebarTitle = styled.h2`
  font-size: 1.1rem;
  color: ${cssVar('--color-text')};
  margin: 0 0 1rem 0;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  color: ${cssVar('--color-text-secondary')};
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: ${cssVar('--color-background')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 8px;
  color: ${cssVar('--color-text')};
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${cssVar('--color-primary')};
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  background: ${cssVar('--color-background')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 8px;
  color: ${cssVar('--color-text')};
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: ${cssVar('--color-primary')};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  background: ${cssVar('--color-background')};
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 8px;
  color: ${cssVar('--color-text')};
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${cssVar('--color-primary')};
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: ${props => props.disabled
    ? cssVar('--color-border')
    : cssVar('--color-primary')};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  margin-bottom: 0.5rem;

  &:hover {
    background: ${props => props.disabled
      ? cssVar('--color-border')
      : cssVar('--color-primary-accent')};
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Card = styled.div`
  background: ${cssVar('--color-surface')};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${cssVar('--color-border')};
`;

const CardTitle = styled.h3`
  font-size: 1.2rem;
  color: ${cssVar('--color-text')};
  margin: 0 0 1rem 0;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid ${cssVar('--color-border')};
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: ${props => props.$active
    ? cssVar('--color-primary')
    : cssVar('--color-text-secondary')};
  border: none;
  border-bottom: 2px solid ${props => props.$active
    ? cssVar('--color-primary')
    : 'transparent'};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    color: ${cssVar('--color-primary')};
  }
`;

const SuggestionCard = styled.div`
  background: ${cssVar('--color-background')};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid ${cssVar('--color-border')};
`;

const SuggestionTitle = styled.h4`
  font-size: 1rem;
  color: ${cssVar('--color-text')};
  margin: 0 0 0.5rem 0;
`;

const SEOScore = styled.div`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: ${props => {
    const score = props.score;
    if (score >= 80) return '#00d26a';
    if (score >= 60) return '#ffb020';
    return '#f8312f';
  }};
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
`;

const SuggestionDescription = styled.p`
  font-size: 0.85rem;
  color: ${cssVar('--color-text-secondary')};
  margin: 0.5rem 0;
  line-height: 1.5;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const Tag = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${cssVar('--color-primary')}15;
  color: ${cssVar('--color-primary')};
  border-radius: 12px;
  font-size: 0.75rem;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${cssVar('--color-text-secondary')};
`;

const ErrorMessage = styled.div`
  background: #f8312f15;
  color: #f8312f;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  background: #00d26a15;
  color: #00d26a;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const SeoContentSuggestions = () => {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [targetAudience, setTargetAudience] = useState('general');
  const [tone, setTone] = useState('professional');
  const [content, setContent] = useState('');

  // Results state
  const [keywordAnalysis, setKeywordAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [optimization, setOptimization] = useState(null);
  const [metaDescriptions, setMetaDescriptions] = useState([]);
  const [densityAnalysis, setDensityAnalysis] = useState(null);

  const handleGenerateSuggestions = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (!keywords.trim()) {
      setError('Please enter at least one keyword');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      const response = await fetch('http://localhost:3001/api/seo-suggestions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          keywords: keywordArray,
          contentType,
          targetAudience,
          tone,
          count: 5
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
        setSuccess(`Generated ${data.suggestions.length} content suggestions!`);
        setActiveTab('suggestions');
      } else {
        setError(data.error || 'Failed to generate suggestions');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!topic.trim() || !keywords.trim()) {
      setError('Please enter topic and keywords');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      const response = await fetch('http://localhost:3001/api/seo-suggestions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          keywords: keywordArray,
          contentType,
          targetAudience,
          tone
        })
      });

      const data = await response.json();

      if (data.success) {
        setKeywordAnalysis(data.keywordAnalysis);
        setSuggestions(data.contentSuggestions);
        setMetaDescriptions(data.metaDescriptions);
        setSuccess('Complete SEO package generated!');
        setActiveTab('suggestions');
      } else {
        setError(data.error || 'Failed to generate package');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>🔍 SEO Content Suggestions</Title>
      </Header>

      <TwoColumnLayout>
        <Sidebar>
          <SidebarTitle>Configuration</SidebarTitle>

          <FormGroup>
            <Label>Topic *</Label>
            <Input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Benefits of AI in Marketing"
            />
          </FormGroup>

          <FormGroup>
            <Label>Keywords (comma-separated) *</Label>
            <Textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="AI marketing, digital marketing, automation"
            />
          </FormGroup>

          <FormGroup>
            <Label>Content Type</Label>
            <Select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              <option value="blog">Blog Post</option>
              <option value="article">Article</option>
              <option value="social">Social Media</option>
              <option value="landing">Landing Page</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Target Audience</Label>
            <Select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            >
              <option value="general">General</option>
              <option value="beginners">Beginners</option>
              <option value="professionals">Professionals</option>
              <option value="experts">Experts</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Tone</Label>
            <Select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
            </Select>
          </FormGroup>

          <Button
            onClick={handleComplete}
            disabled={loading || !topic.trim() || !keywords.trim()}
          >
            {loading ? '⏳ Generating...' : '🚀 Generate Complete Package'}
          </Button>

          <Button
            onClick={handleGenerateSuggestions}
            disabled={loading || !topic.trim() || !keywords.trim()}
          >
            💡 Generate Suggestions
          </Button>
        </Sidebar>

        <ContentArea>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          <Card>
            <Tabs>
              <Tab
                $active={activeTab === 'suggestions'}
                onClick={() => setActiveTab('suggestions')}
              >
                Content Suggestions
              </Tab>
              <Tab
                $active={activeTab === 'analysis'}
                onClick={() => setActiveTab('analysis')}
              >
                Keyword Analysis
              </Tab>
              <Tab
                $active={activeTab === 'meta'}
                onClick={() => setActiveTab('meta')}
              >
                Meta Descriptions
              </Tab>
            </Tabs>

            {activeTab === 'suggestions' && (
              <div>
                {suggestions.length === 0 ? (
                  <LoadingSpinner>
                    Configure topic and keywords, then click "Generate Complete Package" or "Generate Suggestions"
                  </LoadingSpinner>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <SuggestionCard key={index}>
                      <SuggestionTitle>
                        {suggestion.title}
                        <SEOScore score={suggestion.seoScore}>
                          SEO: {suggestion.seoScore}/100
                        </SEOScore>
                      </SuggestionTitle>
                      <SuggestionDescription>{suggestion.description}</SuggestionDescription>
                      <Tags>
                        {suggestion.topics?.map((topic, i) => (
                          <Tag key={i}>{topic}</Tag>
                        ))}
                        <Tag>Intent: {suggestion.searchIntent}</Tag>
                        <Tag>~{suggestion.estimatedWordCount} words</Tag>
                      </Tags>
                    </SuggestionCard>
                  ))
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div>
                {!keywordAnalysis ? (
                  <LoadingSpinner>
                    Click "Generate Complete Package" to see detailed keyword analysis
                  </LoadingSpinner>
                ) : (
                  <div>
                    <CardTitle>Keyword Analysis</CardTitle>
                    {keywordAnalysis.keywords?.map((keyword, index) => (
                      <SuggestionCard key={index}>
                        <h4>{keyword.keyword}</h4>
                        <p>Monthly Volume: {keyword.searchVolume.monthly.toLocaleString()}</p>
                        <p>Difficulty: {keyword.difficulty}/100</p>
                        <p>Opportunity Score: {keyword.opportunityScore}/100</p>
                        <Tags>
                          <Tag>Trend: {keyword.searchVolume.trend}</Tag>
                        </Tags>
                      </SuggestionCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'meta' && (
              <div>
                {metaDescriptions.length === 0 ? (
                  <LoadingSpinner>
                    Click "Generate Complete Package" to see meta descriptions
                  </LoadingSpinner>
                ) : (
                  <div>
                    <CardTitle>Meta Descriptions</CardTitle>
                    {metaDescriptions.map((desc, index) => (
                      <SuggestionCard key={index}>
                        <p style={{ marginBottom: '0.5rem' }}>{desc.text}</p>
                        <Tags>
                          <Tag>Score: {desc.score}</Tag>
                          <Tag>{desc.characterCount} chars</Tag>
                          {desc.includesKeyword && <Tag>✓ Has Keyword</Tag>}
                          {desc.hasCallToAction && <Tag>✓ CTA</Tag>}
                        </Tags>
                      </SuggestionCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </ContentArea>
      </TwoColumnLayout>
    </PageContainer>
  );
};

export default SeoContentSuggestions;
