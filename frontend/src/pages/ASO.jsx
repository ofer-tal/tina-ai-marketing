import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme?.colors?.text || '#eaeaea'};
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: ${props => props.theme?.colors?.textSecondary || '#a0a0a0'};
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: ${props => props.theme?.colors?.textSecondary || '#a0a0a0'};
`;

const ErrorMessage = styled.div`
  background: rgba(248, 49, 47, 0.1);
  border: 1px solid rgba(248, 49, 47, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #f8312f;
`;

const Section = styled.div`
  background: ${props => props.theme?.colors?.surface || '#16213e'};
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#eaeaea'};
  margin-bottom: 1rem;
`;

const KeywordTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#2d3561'};
  color: ${props => props.theme?.colors?.textSecondary || '#a0a0a0'};
  font-weight: 600;
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#2d3561'};
`;

const TableRow = styled.tr`
  &:hover {
    background: ${props => props.theme?.colors?.background || '#1a1a2e'};
  }
`;

const RankingBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${props => {
    const ranking = props.ranking;
    if (ranking <= 10) return 'rgba(0, 210, 106, 0.2)';
    if (ranking <= 50) return 'rgba(255, 176, 32, 0.2)';
    return 'rgba(248, 49, 47, 0.2)';
  }};
  color: ${props => {
    const ranking = props.ranking;
    if (ranking <= 10) return '#00d26a';
    if (ranking <= 50) return '#ffb020';
    return '#f8312f';
  }};
`;

export default function ASO() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keywords, setKeywords] = useState([]);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/aso/keywords');
      const data = await response.json();

      if (data.success) {
        setKeywords(data.data || []);
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Failed to fetch keywords');
      }
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner>
          <div>Loading ASO data...</div>
        </LoadingSpinner>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Header>
          <Title>🍎 App Store Optimization</Title>
          <Subtitle>Track and optimize your App Store keyword rankings</Subtitle>
        </Header>
        <ErrorMessage>
          Error: {error}
        </ErrorMessage>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>🍎 App Store Optimization</Title>
        <Subtitle>Track and optimize your App Store keyword rankings</Subtitle>
      </Header>

      <Section>
        <SectionTitle>Tracked Keywords</SectionTitle>
        {keywords.length === 0 ? (
          <p style={{ color: '#a0a0a0' }}>No keywords tracked yet. Add keywords to start monitoring rankings.</p>
        ) : (
          <KeywordTable>
            <Table>
              <thead>
                <tr>
                  <TableHeader>Keyword</TableHeader>
                  <TableHeader>Current Ranking</TableHeader>
                  <TableHeader>Volume</TableHeader>
                  <TableHeader>Competition</TableHeader>
                  <TableHeader>Difficulty</TableHeader>
                </tr>
              </thead>
              <tbody>
                {keywords.map(keyword => (
                  <TableRow key={keyword._id || keyword.keyword}>
                    <TableCell>{keyword.keyword}</TableCell>
                    <TableCell>
                      <RankingBadge ranking={keyword.ranking}>
                        #{keyword.ranking}
                      </RankingBadge>
                    </TableCell>
                    <TableCell>{keyword.volume || 'N/A'}</TableCell>
                    <TableCell>{keyword.competition || 'N/A'}</TableCell>
                    <TableCell>{keyword.difficulty || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </KeywordTable>
        )}
      </Section>

      <Section>
        <SectionTitle>ASO Metrics</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>Total Keywords</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#e94560' }}>{keywords.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>Top 10 Rankings</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00d26a' }}>
              {keywords.filter(k => k.ranking <= 10).length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>Top 50 Rankings</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffb020' }}>
              {keywords.filter(k => k.ranking <= 50).length}
            </div>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
}
