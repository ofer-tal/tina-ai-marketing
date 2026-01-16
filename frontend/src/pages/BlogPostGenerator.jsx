/**
 * Blog Post Generator Page
 * AI-powered blog post generation with review and export capabilities
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
      background: ${cssVar('--color-primary-hover')};
    }

    &:disabled {
      background: ${cssVar('--color-border')};
      cursor: not-allowed;
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: ${cssVar('--color-surface')};
    color: ${cssVar('--color-text')};
    border: 1px solid ${cssVar('--color-border')};

    &:hover {
      border-color: ${cssVar('--color-primary')};
    }
  `}
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;

  input[type="checkbox"] {
    cursor: pointer;
  }

  label {
    margin: 0;
    cursor: pointer;
  }
`;

const ContentArea = styled.div`
  background: ${cssVar('--color-surface')};
  border-radius: 8px;
  padding: 20px;
  min-height: 500px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid ${cssVar('--color-border')};
  padding-bottom: 10px;
`;

const Tab = styled.button`
  padding: 8px 16px;
  background: none;
  border: none;
  color: ${cssVar('--color-text-secondary')};
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;

  ${props => props.active && `
    background: ${cssVar('--color-primary')};
    color: white;
  `}
`;

const EditorContainer = styled.div`
  textarea {
    width: 100%;
    min-height: 400px;
    padding: 15px;
    border: 1px solid ${cssVar('--color-border')};
    border-radius: 4px;
    background: ${cssVar('--color-background')};
    color: ${cssVar('--color-text')};
    font-size: 14px;
    line-height: 1.6;
    font-family: 'Monaco', 'Menlo', monospace;
    resize: vertical;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: ${cssVar('--color-primary')};
    }
  }
`;

const PreviewContainer = styled.div`
  padding: 20px;
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 4px;
  background: white;
  color: #333;
  line-height: 1.6;
  max-height: 600px;
  overflow-y: auto;

  h1 { font-size: 28px; margin: 0 0 15px 0; }
  h2 { font-size: 22px; margin: 25px 0 15px 0; }
  h3 { font-size: 18px; margin: 20px 0 10px 0; }
  p { margin: 0 0 15px 0; }
  ul, ol { margin: 0 0 15px 0; padding-left: 30px; }
  li { margin: 5px 0; }
  strong { font-weight: 600; }
  em { font-style: italic; }
`;

const SEOMetadata = styled.div`
  background: ${cssVar('--color-background')};
  border-radius: 6px;
  padding: 15px;
  margin-top: 20px;

  h4 {
    margin: 0 0 10px 0;
    font-size: 13px;
    color: ${cssVar('--color-text')};
  }

  div {
    font-size: 12px;
    color: ${cssVar('--color-text-secondary')};
    margin: 5px 0;
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding: 10px 15px;
  background: ${cssVar('--color-background')};
  border-radius: 6px;

  div {
    font-size: 13px;
    color: ${cssVar('--color-text-secondary')};

    strong {
      color: ${cssVar('--color-text')};
      margin-left: 5px;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${cssVar('--color-border')};
`;

const LoadingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: ${cssVar('--color-text-secondary')};

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid ${cssVar('--color-border')};
    border-top-color: ${cssVar('--color-primary')};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

function BlogPostGenerator() {
  const [activeTab, setActiveTab] = useState('edit');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('general');
  const [keywords, setKeywords] = useState('');
  const [includeSEO, setIncludeSEO] = useState(true);
  const [targetLength, setTargetLength] = useState(1000);

  const [generatedPost, setGeneratedPost] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);

      const response = await fetch('/api/blog-posts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          tone,
          targetAudience,
          keywords: keywordList,
          includeSEO,
          targetLength
        })
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedPost(result);
        setEditedContent(result.content);
        setActiveTab('edit');
        setSavedId(result.id);
      } else {
        setError(result.error || 'Failed to generate blog post');
      }
    } catch (err) {
      console.error('Error generating blog post:', err);
      setError('Failed to generate blog post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!savedId) return;

    try {
      const response = await fetch(`/api/blog-posts/${savedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedContent,
          status: 'review'
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Blog post saved successfully!');
      } else {
        alert('Failed to save blog post');
      }
    } catch (err) {
      console.error('Error saving blog post:', err);
      alert('Failed to save blog post');
    }
  };

  const handleExport = async (format) => {
    if (!savedId) {
      alert('No blog post to export');
      return;
    }

    try {
      const response = await fetch(`/api/blog-posts/${savedId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      const result = await response.json();

      if (result.success) {
        // Create download link
        const blob = new Blob([result.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to export blog post');
      }
    } catch (err) {
      console.error('Error exporting blog post:', err);
      alert('Failed to export blog post');
    }
  };

  const renderPreview = () => {
    if (!generatedPost) return null;

    // Simple markdown to HTML conversion
    let html = editedContent;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Lists
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    return <PreviewContainer dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <PageContainer>
      <Header>
        <h1>📝 Blog Post Generator</h1>
        <p>Generate SEO-optimized blog posts with AI assistance</p>
      </Header>

      <GeneratorGrid>
        <Sidebar>
          <SectionTitle>Configuration</SectionTitle>

          <FormGroup>
            <label>Topic *</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your blog post topic..."
            />
          </FormGroup>

          <FormGroup>
            <label>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="expert">Expert</option>
              <option value="conversational">Conversational</option>
            </select>
          </FormGroup>

          <FormGroup>
            <label>Target Audience</label>
            <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
              <option value="general">General Audience</option>
              <option value="beginners">Beginners</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="executives">Executives</option>
            </select>
          </FormGroup>

          <FormGroup>
            <label>Keywords (comma-separated)</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3..."
            />
          </FormGroup>

          <FormGroup>
            <label>Target Length</label>
            <select value={targetLength} onChange={(e) => setTargetLength(parseInt(e.target.value))}>
              <option value={500}>~500 words</option>
              <option value={800}>~800 words</option>
              <option value={1000}>~1000 words</option>
              <option value={1500}>~1500 words</option>
              <option value={2000}>~2000 words</option>
            </select>
          </FormGroup>

          <CheckboxGroup>
            <input
              type="checkbox"
              checked={includeSEO}
              onChange={(e) => setIncludeSEO(e.target.checked)}
            />
            <label>Include SEO metadata</label>
          </CheckboxGroup>

          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
          >
            {loading ? 'Generating...' : 'Generate Blog Post'}
          </Button>
        </Sidebar>

        <ContentArea>
          {loading ? (
            <LoadingOverlay>
              <div className="spinner" />
              <p>Generating your blog post...</p>
              <small>This may take a moment</small>
            </LoadingOverlay>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#e74c3c' }}>{error}</p>
              <Button
                variant="secondary"
                onClick={() => setError(null)}
                style={{ width: 'auto' }}
              >
                Dismiss
              </Button>
            </div>
          ) : !generatedPost ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: '#999', marginBottom: '20px' }}>
                Configure your blog post settings and click "Generate" to create content
              </p>
              <div style={{ fontSize: '48px' }}>📝</div>
            </div>
          ) : (
            <>
              <StatsBar>
                <div>Words: <strong>{editedContent.split(/\s+/).length}</strong></div>
                <div>Read Time: <strong>{Math.ceil(editedContent.split(/\s+/).length / 200)} min</strong></div>
                <div>Status: <strong>Draft</strong></div>
              </StatsBar>

              <TabBar>
                <Tab active={activeTab === 'edit'} onClick={() => setActiveTab('edit')}>
                  ✏️ Edit
                </Tab>
                <Tab active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
                  👁️ Preview
                </Tab>
                {generatedPost.seoMetadata && (
                  <Tab active={activeTab === 'seo'} onClick={() => setActiveTab('seo')}>
                    🔍 SEO
                  </Tab>
                )}
              </TabBar>

              {activeTab === 'edit' && (
                <EditorContainer>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Your blog post content will appear here..."
                  />
                </EditorContainer>
              )}

              {activeTab === 'preview' && renderPreview()}

              {activeTab === 'seo' && generatedPost.seoMetadata && (
                <SEOMetadata>
                  <h4>SEO Metadata</h4>
                  <div><strong>Meta Title:</strong> {generatedPost.seoMetadata.metaTitle}</div>
                  <div><strong>Meta Description:</strong> {generatedPost.seoMetadata.metaDescription}</div>
                  <div><strong>Slug:</strong> {generatedPost.seoMetadata.slug}</div>
                  <div><strong>Focus Keyword:</strong> {generatedPost.seoMetadata.focusKeyword}</div>
                  <div><strong>Readability Score:</strong> {generatedPost.seoMetadata.readabilityScore}/100</div>
                  {generatedPost.seoMetadata.suggestedTags.length > 0 && (
                    <div>
                      <strong>Suggested Tags:</strong> {generatedPost.seoMetadata.suggestedTags.join(', ')}
                    </div>
                  )}
                </SEOMetadata>
              )}

              <ActionButtons>
                <Button variant="primary" onClick={handleSave} style={{ width: 'auto', marginBottom: 0 }}>
                  💾 Save Draft
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleExport('markdown')}
                  style={{ width: 'auto', marginBottom: 0 }}
                >
                  📄 Export Markdown
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleExport('html')}
                  style={{ width: 'auto', marginBottom: 0 }}
                >
                  🌐 Export HTML
                </Button>
              </ActionButtons>
            </>
          )}
        </ContentArea>
      </GeneratorGrid>
    </PageContainer>
  );
}

export default BlogPostGenerator;
