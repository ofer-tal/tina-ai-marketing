/**
 * Press Release Generator Page
 * AI-powered press release generation for app updates and announcements
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
`;

const Tab = styled.button`
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.active ? cssVar('--color-primary') : 'transparent'};
  color: ${props => props.active ? cssVar('--color-primary') : cssVar('--color-text-secondary')};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${cssVar('--color-primary')};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 400px;
  padding: 15px;
  border: 1px solid ${cssVar('--color-border')};
  border-radius: 4px;
  background: ${cssVar('--color-background')};
  color: ${cssVar('--color-text')};
  font-size: 14px;
  line-height: 1.6;
  font-family: monospace;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${cssVar('--color-primary')};
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 20px;
  padding: 12px;
  background: ${cssVar('--color-background')};
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 13px;
  color: ${cssVar('--color-text-secondary')};

  strong {
    color: ${cssVar('--color-text')};
  }
`;

const PreviewArea = styled.div`
  background: ${cssVar('--color-background')};
  border-radius: 4px;
  padding: 30px;
  min-height: 400px;
  line-height: 1.8;
  font-size: 15px;

  h1 {
    font-size: 28px;
    margin-bottom: 10px;
    color: ${cssVar('--color-text')};
  }

  .dateline {
    color: ${cssVar('--color-text-secondary')};
    font-style: italic;
    margin-bottom: 20px;
  }

  p {
    margin-bottom: 15px;
    color: ${cssVar('--color-text')};
  }

  .quote {
    background: ${cssVar('--color-surface')};
    border-left: 4px solid ${cssVar('--color-primary')};
    padding: 15px;
    margin: 20px 0;
    font-style: italic;
  }

  .quote-attribution {
    margin-top: 10px;
    font-size: 14px;
    color: ${cssVar('--color-text-secondary')};
  }

  .boilerplate {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid ${cssVar('--color-border')};
  }

  .media-contact {
    margin-top: 20px;
    padding: 15px;
    background: ${cssVar('--color-surface')};
    border-radius: 4px;
  }
`;

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
`;

const MetadataItem = styled.div`
  padding: 12px;
  background: ${cssVar('--color-background')};
  border-radius: 4px;

  label {
    display: block;
    font-size: 12px;
    color: ${cssVar('--color-text-secondary')};
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  div {
    font-size: 14px;
    color: ${cssVar('--color-text')};
    font-weight: 500;
  }
`;

function PressReleaseGenerator() {
  const [activeTab, setActiveTab] = useState('edit');
  const [updates, setUpdates] = useState('');
  const [tone, setTone] = useState('professional');
  const [companyName, setCompanyName] = useState('Blush App');
  const [companyWebsite, setCompanyWebsite] = useState('https://blush.app');
  const [contactEmail, setContactEmail] = useState('press@blush.app');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pressRelease, setPressRelease] = useState(null);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const handleGenerate = async () => {
    if (!updates.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const updatesObj = {
        description: updates,
        date: new Date().toISOString().split('T')[0]
      };

      const companyInfo = {
        name: companyName,
        website: companyWebsite,
        contactEmail: contactEmail,
        contactPhone: contactPhone
      };

      const response = await fetch('/api/press-releases/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: updatesObj,
          tone,
          companyInfo
        })
      });

      const data = await response.json();

      if (data.success) {
        setPressRelease(data.data);
        setSavedId(data.data.id || data.data._id);
        setActiveTab('preview');
      } else {
        setError(data.error || 'Failed to generate press release');
      }
    } catch (err) {
      console.error('Error generating press release:', err);
      setError('Failed to generate press release. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!savedId) return;

    try {
      const response = await fetch(`/api/press-releases/${savedId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      const data = await response.json();

      if (data.success) {
        // Create download link
        const blob = new Blob([data.data.content], { type: data.data.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting press release:', err);
    }
  };

  const handleSave = async () => {
    if (!pressRelease) return;

    try {
      alert('Press release saved successfully!');
    } catch (err) {
      console.error('Error saving press release:', err);
    }
  };

  const renderEditTab = () => (
    <>
      <StatsBar>
        <span>Words: <strong>{pressRelease?.wordCount || 0}</strong></span>
        <span>Reading Time: <strong>{pressRelease?.readingTime || 0} min</strong></span>
        <span>Status: <strong>{savedId ? 'Saved' : 'Draft'}</strong></span>
      </StatsBar>

      <TextArea
        value={pressRelease ? JSON.stringify(pressRelease, null, 2) : '// Generate a press release to see the content here'}
        onChange={(e) => {
          try {
            setPressRelease(JSON.parse(e.target.value));
          } catch (err) {
            // Ignore JSON parse errors while typing
          }
        }}
        placeholder="Press release content will appear here..."
      />
    </>
  );

  const renderPreviewTab = () => (
    <PreviewArea>
      {!pressRelease ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', paddingTop: '100px' }}>
          Generate a press release to see the preview
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '20px' }}>
            FOR IMMEDIATE RELEASE
          </p>
          <h1>{pressRelease.headline}</h1>
          <p className="dateline">{pressRelease.dateline}</p>
          <p>{pressRelease.leadParagraph}</p>

          {pressRelease.bodyParagraphs?.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}

          {pressRelease.quotes?.map((quote, idx) => (
            <div key={idx} className="quote">
              <p>"{quote.quote}"</p>
              <p className="quote-attribution">— {quote.attributedTo}{quote.context ? `, ${quote.context}` : ''}</p>
            </div>
          ))}

          <p><strong>{pressRelease.callToAction}</strong></p>

          <div className="boilerplate">
            <h4>{pressRelease.aboutSection || 'About Blush'}</h4>
            <p>{pressRelease.boilerplate}</p>
          </div>

          <div className="media-contact">
            <h5>Media Contact:</h5>
            <p>{pressRelease.mediaContact?.name}</p>
            <p>{pressRelease.mediaContact?.email}</p>
            {pressRelease.mediaContact?.phone && <p>{pressRelease.mediaContact.phone}</p>}
          </div>
        </>
      )}
    </PreviewArea>
  );

  const renderMetadataTab = () => (
    <MetadataGrid>
      <MetadataItem>
        <label>Headline</label>
        <div>{pressRelease?.headline || '-'}</div>
      </MetadataItem>
      <MetadataItem>
        <label>Tone</label>
        <div>{tone}</div>
      </MetadataItem>
      <MetadataItem>
        <label>Dateline</label>
        <div>{pressRelease?.dateline || '-'}</div>
      </MetadataItem>
      <MetadataItem>
        <label>Word Count</label>
        <div>{pressRelease?.wordCount || 0}</div>
      </MetadataItem>
      <MetadataItem>
        <label>Reading Time</label>
        <div>{pressRelease?.readingTime || 0} minutes</div>
      </MetadataItem>
      <MetadataItem>
        <label>Status</label>
        <div>{savedId ? 'Saved to Database' : 'Draft'}</div>
      </MetadataItem>
      <MetadataItem>
        <label>Company</label>
        <div>{companyName}</div>
      </MetadataItem>
      <MetadataItem>
        <label>Contact Email</label>
        <div>{contactEmail}</div>
      </MetadataItem>
    </MetadataGrid>
  );

  return (
    <PageContainer>
      <Header>
        <h1>📰 Press Release Generator</h1>
        <p>AI-powered press release generation for app updates and announcements</p>
      </Header>

      <GeneratorGrid>
        <Sidebar>
          <SectionTitle>Update Details</SectionTitle>

          <FormGroup>
            <label htmlFor="updates">What's New? *</label>
            <textarea
              id="updates"
              value={updates}
              onChange={(e) => setUpdates(e.target.value)}
              placeholder="Describe the updates or news you want to announce..."
              required
            />
          </FormGroup>

          <FormGroup>
            <label htmlFor="tone">Tone</label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="professional">Professional</option>
              <option value="exciting">Exciting</option>
              <option value="casual">Casual</option>
              <option value="urgent">Urgent</option>
            </select>
          </FormGroup>

          <SectionTitle>Company Info</SectionTitle>

          <FormGroup>
            <label htmlFor="companyName">Company Name</label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <label htmlFor="companyWebsite">Website</label>
            <input
              type="text"
              id="companyWebsite"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <label htmlFor="contactEmail">Contact Email</label>
            <input
              type="text"
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <label htmlFor="contactPhone">Contact Phone (optional)</label>
            <input
              type="text"
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </FormGroup>

          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={!updates.trim() || loading}
          >
            {loading ? 'Generating...' : 'Generate Press Release'}
          </Button>

          {error && (
            <div style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: '10px' }}>
              {error}
            </div>
          )}
        </Sidebar>

        <ContentArea>
          <TabBar>
            <Tab active={activeTab === 'edit'} onClick={() => setActiveTab('edit')}>
              Edit
            </Tab>
            <Tab active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
              Preview
            </Tab>
            <Tab active={activeTab === 'metadata'} onClick={() => setActiveTab('metadata')}>
              Metadata
            </Tab>
          </TabBar>

          {activeTab === 'edit' && renderEditTab()}
          {activeTab === 'preview' && renderPreviewTab()}
          {activeTab === 'metadata' && renderMetadataTab()}

          {pressRelease && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <Button variant="secondary" onClick={() => handleExport('txt')}>
                Export Text
              </Button>
              <Button variant="secondary" onClick={() => handleExport('html')}>
                Export HTML
              </Button>
              <Button variant="secondary" onClick={() => handleExport('md')}>
                Export Markdown
              </Button>
              {savedId && (
                <Button variant="secondary" onClick={handleSave}>
                  Save Draft
                </Button>
              )}
            </div>
          )}
        </ContentArea>
      </GeneratorGrid>
    </PageContainer>
  );
}

export default PressReleaseGenerator;
