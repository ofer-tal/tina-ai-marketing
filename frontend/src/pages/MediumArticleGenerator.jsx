/**
 * Medium Article Generator Page
 * AI-powered Medium article creation with Medium-specific formatting
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { cssVar } from '../themeUtils';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 30px;

  h1 {
    font-size: 28px;
    color: ${cssVar('--color-text')};
    margin: 0 0 8px 0;
  }

  p {
    color: ${cssVar('--color-text-secondary')};
    margin: 0;
  }
`;

const GeneratorGrid = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
  margin-bottom: 20px;
`;

const Sidebar = styled.div`
  background: ${cssVar('--color-surface')};
  border-radius: 8px;
  padding: 20px;
  height: fit-content;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  color: ${cssVar('--color-text')};
  margin: 0 0 15px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;

  label {
    display: block;
    font-size: 13px;
    color: ${cssVar('--color-text-secondary')};
    margin-bottom: 5px;
  }

  input[type="text"],
  input[type="number"],
  textarea,
  select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${cssVar('--color-border')};
    border-radius: 4px;
    background: ${cssVar('--color-background')};
    color: ${cssVar('--color-text')};
    font-size: 14px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: ${cssVar('--color-primary')};
    }
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 10px;

  ${props => props.variant === 'primary' && `
    background: ${cssVar('--color-primary')};
    color: white;

    &:hover {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: ${cssVar('--color-surface')};
    color: ${cssVar('--color-text')};
    border: 1px solid ${cssVar('--color-border')};

    &:hover {
      background: ${cssVar('--color-background')};
    }
  `}

  ${props => props.variant === 'success' && `
    background: #10b981;
    color: white;

    &:hover {
      opacity: 0.9;
    }
  `}
`;

const ContentPanel = styled.div`
  background: ${cssVar('--color-surface')};
  border-radius: 8px;
  padding: 20px;
  min-height: 600px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid ${cssVar('--color-border')};
  padding-bottom: 10px;
`;

const Tab = styled.button`
  padding: 8px 16px;
  border: none;
  background: none;
  color: ${cssVar('--color-text-secondary')};
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;

  ${props => props.active && `
    color: ${cssVar('--color-primary')};
    border-bottom-color: ${cssVar('--color-primary')};
  `}
`;

const EditorTextarea = styled.textarea`
  width: 100%;
  min-height: 500px;
  padding: 15px;
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 6px;
  background: ${cssVar('--color-background')};
  color: ${cssVar('--color-text')};
  font-size: 15px;
  line-height: 1.6;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${cssVar('--color-primary')};
  }
`;

const PreviewContent = styled.div`
  min-height: 500px;
  padding: 15px;
  background: ${cssVar('--color-background')};
  border-radius: 6px;
  border: 1px solid ${cssVar('--color-border')};

  h1 { font-size: 32px; margin: 0 0 16px 0; }
  h2 { font-size: 24px; margin: 30px 0 16px 0; }
  h3 { font-size: 20px; margin: 20px 0 12px 0; }
  p { font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
  ul, ol { margin: 0 0 16px 20px; }
  li { margin: 8px 0; }
  blockquote {
    border-left: 4px solid ${cssVar('--color-primary')};
    padding-left: 16px;
    margin: 20px 0;
    font-style: italic;
    color: ${cssVar('--color-text-secondary')};
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 20px;
  padding: 12px;
  background: ${cssVar('--color-background')};
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 13px;
  color: ${cssVar('--color-text-secondary')};

  .stat {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .value {
    font-weight: 600;
    color: ${cssVar('--color-text')};
  }
`;

const SEOPanel = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;

  .seo-item {
    padding: 12px;
    background: ${cssVar('--color-background')};
    border-radius: 6px;

    label {
      display: block;
      font-size: 12px;
      color: ${cssVar('--color-text-secondary')};
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 14px;
      color: ${cssVar('--color-text')};
      word-break: break-word;
    }
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;

  .tag {
    padding: 4px 10px;
    background: ${cssVar('--color-primary')};
    color: white;
    border-radius: 4px;
    font-size: 12px;
  }
`;

const Alert = styled.div`
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;

  ${props => props.type === 'success' && `
    background: #10b98120;
    color: #10b981;
    border: 1px solid #10b981;
  `}

  ${props => props.type === 'error' && `
    background: #ef444420;
    color: #ef4444;
    border: 1px solid #ef4444;
  `}

  ${props => props.type === 'info' && `
    background: ${cssVar('--color-primary')}20;
    color: ${cssVar('--color-primary')};
    border: 1px solid ${cssVar('--color-primary')};
  `}
`;

const MediumArticleGenerator = () => {
  const [config, setConfig] = useState({
    topic: '',
    targetAudience: 'General',
    tone: 'Conversational',
    keywords: ''
  });

  const [article, setArticle] = useState(null);
  const [activeTab, setActiveTab] = useState('edit');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!config.topic.trim()) {
      setMessage({ type: 'error', text: 'Please enter a topic' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const keywords = config.keywords.split(',').map(k => k.trim()).filter(k => k);

      const response = await fetch('/api/medium-articles/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          keywords
        })
      });

      const data = await response.json();

      if (data.success) {
        setArticle(data.data);
        setActiveTab('edit');
        setMessage({ type: 'success', text: 'Article generated successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate article' });
      }
    } catch (error) {
      console.error('Error generating article:', error);
      setMessage({ type: 'error', text: 'Error generating article' });
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (value) => {
    setArticle(prev => ({
      ...prev,
      content: value,
      wordCount: value.trim().split(/\s+/).length
    }));
  };

  const handleSave = async () => {
    if (!article?._id) return;

    try {
      const response = await fetch(`/api/medium-articles/${article._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Article saved successfully!' });
      }
    } catch (error) {
      console.error('Error saving article:', error);
      setMessage({ type: 'error', text: 'Failed to save article' });
    }
  };

  const handleExport = async (format = 'markdown') => {
    if (!article?._id) return;

    try {
      const response = await fetch(`/api/medium-articles/${article._id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${article.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${format === 'markdown' ? 'md' : 'html'}`;
        a.click();
        window.URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: `Exported as ${format.toUpperCase()}!` });
      }
    } catch (error) {
      console.error('Error exporting article:', error);
      setMessage({ type: 'error', text: 'Failed to export article' });
    }
  };

  const handlePublish = async () => {
    if (!article?._id) return;

    try {
      const response = await fetch(`/api/medium-articles/${article._id}/publish`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setArticle(data.data);
        setMessage({ type: 'success', text: 'Article marked as ready for Medium publishing!' });
      }
    } catch (error) {
      console.error('Error publishing article:', error);
      setMessage({ type: 'error', text: 'Failed to mark as ready' });
    }
  };

  const formatForPreview = (content) => {
    if (!content) return '';

    let html = content;

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Paragraphs
    html = html.split('\n\n').map(p => `<p>${p}</p>`).join('');

    // Bullet points
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return html;
  };

  return (
    <PageContainer>
      <Header>
        <h1>📝 Medium Article Generator</h1>
        <p>Create and manage Medium article content with AI assistance</p>
      </Header>

      <GeneratorGrid>
        <Sidebar>
          <SectionTitle>Article Configuration</SectionTitle>

          <FormGroup>
            <label>Topic *</label>
            <textarea
              value={config.topic}
              onChange={(e) => handleConfigChange('topic', e.target.value)}
              placeholder="e.g., The Power of AI in Modern Romance Writing"
            />
          </FormGroup>

          <FormGroup>
            <label>Target Audience</label>
            <select
              value={config.targetAudience}
              onChange={(e) => handleConfigChange('targetAudience', e.target.value)}
            >
              <option>General</option>
              <option>Romance Readers</option>
              <option>Writers/Authors</option>
              <option>Marketing Professionals</option>
              <option>Tech Enthusiasts</option>
              <option>Young Adults (18-25)</option>
              <option>Adults (25-45)</option>
            </select>
          </FormGroup>

          <FormGroup>
            <label>Tone</label>
            <select
              value={config.tone}
              onChange={(e) => handleConfigChange('tone', e.target.value)}
            >
              <option>Conversational</option>
              <option>Professional</option>
              <option>Inspirational</option>
              <option>Educational</option>
              <option>Humorous</option>
              <option>Storytelling</option>
            </select>
          </FormGroup>

          <FormGroup>
            <label>Keywords (comma-separated)</label>
            <textarea
              value={config.keywords}
              onChange={(e) => handleConfigChange('keywords', e.target.value)}
              placeholder="e.g., AI writing, romance novels, content creation"
            />
          </FormGroup>

          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={loading || !config.topic.trim()}
          >
            {loading ? '⏳ Generating...' : '✨ Generate Article'}
          </Button>
        </Sidebar>

        <ContentPanel>
          {message && (
            <Alert type={message.type}>
              {message.text}
            </Alert>
          )}

          {!article ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>✍️</div>
              <h3>Ready to Create Your Medium Article</h3>
              <p style={{ marginTop: '10px' }}>
                Configure your article on the left and click "Generate Article" to start.
              </p>
              <p style={{ marginTop: '10px', fontSize: '13px' }}>
                Medium articles are optimized for engagement, readability, and shareability.
              </p>
            </div>
          ) : (
            <>
              <Tabs>
                <Tab active={activeTab === 'edit'} onClick={() => setActiveTab('edit')}>
                  ✏️ Edit
                </Tab>
                <Tab active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
                  👁️ Preview
                </Tab>
                <Tab active={activeTab === 'seo'} onClick={() => setActiveTab('seo')}>
                  📊 SEO & Stats
                </Tab>
              </Tabs>

              {activeTab === 'edit' && (
                <>
                  <StatsBar>
                    <div className="stat">
                      <span>Words:</span>
                      <span className="value">{article.wordCount || 0}</span>
                    </div>
                    <div className="stat">
                      <span>Read time:</span>
                      <span className="value">{article.estimatedReadingTime || 0} min</span>
                    </div>
                    <div className="stat">
                      <span>Status:</span>
                      <span className="value">{article.status}</span>
                    </div>
                  </StatsBar>

                  <EditorTextarea
                    value={article.content || ''}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Your article content will appear here..."
                  />

                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <Button variant="secondary" onClick={handleSave}>
                      💾 Save Draft
                    </Button>
                    <Button variant="secondary" onClick={() => handleExport('markdown')}>
                      📥 Export MD
                    </Button>
                    <Button variant="secondary" onClick={() => handleExport('html')}>
                      📄 Export HTML
                    </Button>
                    <Button variant="success" onClick={handlePublish}>
                      🚀 Ready for Medium
                    </Button>
                  </div>
                </>
              )}

              {activeTab === 'preview' && (
                <PreviewContent dangerouslySetInnerHTML={{ __html: formatForPreview(article.content) }} />
              )}

              {activeTab === 'seo' && article.seo && (
                <>
                  <h3 style={{ marginBottom: '15px' }}>Article SEO & Performance Data</h3>

                  <SEOPanel>
                    <div className="seo-item">
                      <label>Title</label>
                      <div className="value">{article.seo.title || article.title}</div>
                    </div>

                    <div className="seo-item">
                      <label>Subtitle</label>
                      <div className="value">{article.seo.subtitle || article.subtitle}</div>
                    </div>

                    <div className="seo-item">
                      <label>Reading Time</label>
                      <div className="value">{article.seo.readingTime} minutes</div>
                    </div>

                    <div className="seo-item">
                      <label>Word Count</label>
                      <div className="value">{article.seo.wordCount} words</div>
                    </div>

                    <div className="seo-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Medium Tags (max 5)</label>
                      <TagsContainer>
                        {(article.seo.tags || article.tags || []).map((tag, i) => (
                          <span key={i} className="tag">{tag}</span>
                        ))}
                      </TagsContainer>
                    </div>

                    <div className="seo-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Estimated Engagement (Claps)</label>
                      <div className="value">
                        Min: {article.seo.estimatedClaps?.min || 0} |
                        Avg: {article.seo.estimatedClaps?.avg || 0} |
                        Max: {article.seo.estimatedClaps?.max || 0}
                      </div>
                    </div>

                    <div className="seo-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Featured Image Suggestion</label>
                      <div className="value">
                        {article.seo.featuredImage?.description} <br />
                        <small style={{ color: 'var(--color-text-secondary)' }}>
                          Keywords: {article.seo.featuredImage?.suggestedKeywords} |
                          Size: {article.seo.featuredImage?.recommendedSize}
                        </small>
                      </div>
                    </div>

                    <div className="seo-item">
                      <label>Publish Format</label>
                      <div className="value">{article.seo.publishFormat}</div>
                    </div>

                    <div className="seo-item">
                      <label>Current Status</label>
                      <div className="value">{article.status}</div>
                    </div>
                  </SEOPanel>

                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Button variant="secondary" onClick={handleSave}>
                      💾 Save Draft
                    </Button>
                    <Button variant="success" onClick={handlePublish}>
                      🚀 Ready for Medium
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </ContentPanel>
      </GeneratorGrid>
    </PageContainer>
  );
};

export default MediumArticleGenerator;
