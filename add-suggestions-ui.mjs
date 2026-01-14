import fs from 'fs';

// Read the file
const content = fs.readFileSync('frontend/src/pages/StrategicDashboard.jsx', 'utf8');

// Add the suggestions UI section
const suggestionsUI = `
          {/* ASO Keyword Suggestions Section */}
          {suggestionsData && (
            <>
              <ChartContainer>
                <SuggestionsHeader>
                  <SuggestionsTitle>
                    🎯 New Keyword Opportunities
                    <SuggestionsCount>{suggestionsData.total} suggestions</SuggestionsCount>
                  </SuggestionsTitle>
                </SuggestionsHeader>

                {suggestionsData.suggestions.length > 0 ? (
                  <>
                    <SuggestionsGrid>
                      {suggestionsData.suggestions.map((suggestion, index) => (
                        <SuggestionCard key={index}>
                          <SuggestionCategory $category={suggestion.category}>
                            {suggestion.category}
                          </SuggestionCategory>
                          <SuggestionKeyword>{suggestion.keyword}</SuggestionKeyword>
                          <SuggestionReason>{suggestion.reason}</SuggestionReason>
                          <SuggestionMetrics>
                            <SuggestionMetric>
                              <SuggestionMetricLabel>Volume</SuggestionMetricLabel>
                              <SuggestionMetricValue>
                                {formatNumber(suggestion.volume)}
                              </SuggestionMetricValue>
                            </SuggestionMetric>
                            <SuggestionMetric>
                              <SuggestionMetricLabel>Difficulty</SuggestionMetricLabel>
                              <SuggestionMetricValue
                                $positive={suggestion.difficulty < 50}
                                $negative={suggestion.difficulty > 70}
                              >
                                {suggestion.difficulty}/100
                              </SuggestionMetricValue>
                            </SuggestionMetric>
                            <SuggestionMetric>
                              <SuggestionMetricLabel>Score</SuggestionMetricLabel>
                              <SuggestionMetricValue $positive={true}>
                                {suggestion.opportunityScore}
                              </SuggestionMetricValue>
                            </SuggestionMetric>
                          </SuggestionMetrics>
                          <AddKeywordButton onClick={() => handleAddKeyword(suggestion)}>
                            + Add to Tracking
                          </AddKeywordButton>
                        </SuggestionCard>
                      ))}
                    </SuggestionsGrid>

                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#16213e', borderRadius: '8px', fontSize: '0.9rem', color: '#a0a0a0' }}>
                      <strong>💡 Tip:</strong> These keywords are not currently being tracked but show high potential based on search volume and competition analysis.
                    </div>
                  </>
                ) : (
                  <NoSuggestions>
                    No new keyword opportunities found at this time. Check back later after analyzing more data.
                  </NoSuggestions>
                )}
              </ChartContainer>
            </>
          )}
`;

const updated = content.replace(
  '          {/* Conversion Funnel Section */}',
  `${suggestionsUI}\n\n          {/* Conversion Funnel Section */}`
);

fs.writeFileSync('frontend/src/pages/StrategicDashboard.jsx', updated);
console.log('Added suggestions UI section');
