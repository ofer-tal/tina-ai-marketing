import React, { useState, useEffect } from 'react';
import './ABTestStatistics.css';

function ABTestStatistics() {
  const [experiments, setExperiments] = useState([]);
  const [selectedExperiment, setSelectedExperiment] = useState('');
  const [testType, setTestType] = useState('ztest');
  const [alpha, setAlpha] = useState(0.05);
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    try {
      const response = await fetch('/api/experiments');
      const data = await response.json();
      if (data.success) {
        setExperiments(data.data);
        if (data.data.length > 0 && !selectedExperiment) {
          setSelectedExperiment(data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching experiments:', err);
      setError('Failed to load experiments');
    }
  };

  const runStatisticalTest = async () => {
    if (!selectedExperiment) return;

    setLoading(true);
    setError(null);

    try {
      const [testResponse, summaryResponse] = await Promise.all([
        fetch('/api/ab-test-statistics/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experimentId: selectedExperiment,
            testType
          })
        }),
        fetch(`/api/ab-test-statistics/summary/${selectedExperiment}`)
      ]);

      const testData = await testResponse.json();
      const summaryData = await summaryResponse.json();

      if (testData.success) {
        setResults(testData.data);
      }

      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (err) {
      console.error('Error running statistical test:', err);
      setError('Failed to run statistical test');
    } finally {
      setLoading(false);
    }
  };

  const selectedExperimentData = experiments.find(e => e._id === selectedExperiment);

  return (
    <div className="ab-test-statistics-page">
      <div className="page-header">
        <h1>A/B Test Statistical Significance Calculator</h1>
        <p className="subtitle">Calculate statistical significance for A/B tests using multiple methods</p>
      </div>

      <div className="controls">
        <select
          value={selectedExperiment}
          onChange={(e) => setSelectedExperiment(e.target.value)}
          className="select-input"
        >
          <option value="">Select Experiment</option>
          {experiments.map(exp => (
            <option key={exp._id} value={exp._id}>
              {exp.name} ({exp.status})
            </option>
          ))}
        </select>

        <select
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          className="select-input"
        >
          <option value="ztest">Z-Test (Large Samples)</option>
          <option value="ttest">T-Test (Small Samples)</option>
          <option value="chisquare">Chi-Square Test</option>
          <option value="fisher">Fisher's Exact Test</option>
        </select>

        <select
          value={alpha}
          onChange={(e) => setAlpha(parseFloat(e.target.value))}
          className="select-input"
        >
          <option value={0.1}>90% Confidence (α=0.10)</option>
          <option value={0.05}>95% Confidence (α=0.05)</option>
          <option value={0.01}>99% Confidence (α=0.01)</option>
        </select>

        <button
          onClick={runStatisticalTest}
          disabled={!selectedExperiment || loading}
          className="btn btn-primary"
        >
          {loading ? 'Calculating...' : 'Run Test'}
        </button>

        <button onClick={fetchExperiments} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          Running statistical analysis...
        </div>
      )}

      {results && !loading && (
        <>
          <div className="cards-container">
            <div className="card">
              <div className="card-label">P-Value</div>
              <div className="card-value">
                {results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(4)}
              </div>
              <div className="card-subtext">{results.interpretation}</div>
            </div>

            <div className="card">
              <div className="card-label">Confidence</div>
              <div className="card-value">{results.confidence.toFixed(1)}%</div>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(results.confidence, 100)}%`,
                    backgroundColor: results.confidence >= 95 ? '#4CAF50' :
                                   results.confidence >= 90 ? '#FF9800' : '#F44336'
                  }}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-label">Significant?</div>
              <div className="card-value">
                <span className={`badge ${results.isSignificant ? 'badge-success' : 'badge-warning'}`}>
                  {results.isSignificant ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="card-subtext">At α={alpha} level</div>
            </div>

            <div className="card">
              <div className="card-label">Effect Size</div>
              <div className="card-value">{Math.abs(results.effectSize).toFixed(3)}</div>
              <div className="card-subtext">
                {Math.abs(results.effectSize) < 0.2 ? 'Small' :
                 Math.abs(results.effectSize) < 0.5 ? 'Medium' :
                 Math.abs(results.effectSize) < 0.8 ? 'Large' : 'Very Large'}
              </div>
            </div>

            <div className="card">
              <div className="card-label">Lift</div>
              <div className="card-value">
                {results.lift > 0 ? '+' : ''}{results.lift.toFixed(2)}%
              </div>
              <div className={`card-subtext ${results.lift > 0 ? 'text-success' : 'text-danger'}`}>
                {results.lift > 0 ? 'Variant B' : 'Variant A'} ahead
              </div>
            </div>

            <div className="card">
              <div className="card-label">Test Statistic</div>
              <div className="card-value">{results.testStatistic.toFixed(3)}</div>
              <div className="card-subtext">{results.testName}</div>
            </div>
          </div>

          <div className="results-grid">
            <div className="section">
              <h2 className="section-title">Test Results</h2>

              <div className="test-info">
                <div className="test-name">{results.testName}</div>

                <div className="test-metric">
                  <span className="metric-label">P-Value</span>
                  <span className="metric-value">
                    {results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(4)}
                  </span>
                </div>

                <div className="test-metric">
                  <span className="metric-label">Confidence Level</span>
                  <span className="metric-value">{results.confidence.toFixed(1)}%</span>
                </div>

                <div className="test-metric">
                  <span className="metric-label">Significance</span>
                  <span className="metric-value">
                    <span className={`badge ${results.isSignificant ? 'badge-success' : 'badge-warning'}`}>
                      {results.isSignificant ? 'Significant' : 'Not Significant'}
                    </span>
                  </span>
                </div>

                <div className="test-metric">
                  <span className="metric-label">Test Statistic</span>
                  <span className="metric-value">{results.testStatistic.toFixed(4)}</span>
                </div>

                {results.degreesOfFreedom && (
                  <div className="test-metric">
                    <span className="metric-label">Degrees of Freedom</span>
                    <span className="metric-value">{results.degreesOfFreedom}</span>
                  </div>
                )}

                {results.standardError && (
                  <div className="test-metric">
                    <span className="metric-label">Standard Error</span>
                    <span className="metric-value">{results.standardError.toFixed(4)}</span>
                  </div>
                )}

                <div className="test-metric">
                  <span className="metric-label">Effect Size</span>
                  <span className="metric-value">{Math.abs(results.effectSize).toFixed(4)}</span>
                </div>

                <div className="test-metric">
                  <span className="metric-label">Lift</span>
                  <span className="metric-value">
                    {results.lift > 0 ? '+' : ''}{results.lift.toFixed(2)}%
                  </span>
                </div>

                {results.power && (
                  <div className="test-metric">
                    <span className="metric-label">Statistical Power</span>
                    <span className="metric-value">{results.power.toFixed(1)}%</span>
                  </div>
                )}

                {results.criticalValue && (
                  <div className="test-metric">
                    <span className="metric-label">Critical Value</span>
                    <span className="metric-value">{results.criticalValue.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="section">
              <h2 className="section-title">Test Interpretation</h2>

              <div className={`insight-card ${results.isSignificant ? 'insight-high' : 'insight-low'}`}>
                <div className="insight-title">
                  {results.isSignificant ? '✓ Significant Result' : '✗ Not Significant'}
                </div>
                <div className="insight-text">
                  {results.recommendation}
                </div>
              </div>

              {summary && summary.overallConclusion && (
                <>
                  <div className="insight-card insight-medium">
                    <div className="insight-title">Overall Conclusion</div>
                    <div className="insight-text">
                      {summary.overallConclusion.consensus}
                      {' '}({summary.overallConclusion.recommendation})
                    </div>
                  </div>

                  <div className={`insight-card ${summary.sampleSize.sufficient ? 'insight-low' : 'insight-medium'}`}>
                    <div className="insight-title">Sample Size</div>
                    <div className="insight-text">
                      Total: {summary.sampleSize.total} samples
                      (Variant A: {summary.sampleSize.variantA}, Variant B: {summary.sampleSize.variantB})
                      <br />
                      Target: {selectedExperimentData?.targetSampleSize || 1000}
                      {summary.sampleSize.sufficient ? ' ✓ Sufficient' : ' ⚠ Insufficient'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {summary && summary.testResults && (
            <div className="section">
              <h2 className="section-title">All Statistical Tests Comparison</h2>

              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>P-Value</th>
                    <th>Confidence</th>
                    <th>Significant?</th>
                    <th>Effect Size</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Z-Test</td>
                    <td>{summary.testResults.zTest.pValue < 0.001 ? '< 0.001' : summary.testResults.zTest.pValue.toFixed(4)}</td>
                    <td>{summary.testResults.zTest.confidence.toFixed(1)}%</td>
                    <td>
                      <span className={`badge ${summary.testResults.zTest.isSignificant ? 'badge-success' : 'badge-warning'}`}>
                        {summary.testResults.zTest.isSignificant ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{Math.abs(summary.testResults.zTest.effectSize).toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td>T-Test</td>
                    <td>{summary.testResults.tTest.pValue < 0.001 ? '< 0.001' : summary.testResults.tTest.pValue.toFixed(4)}</td>
                    <td>{summary.testResults.tTest.confidence.toFixed(1)}%</td>
                    <td>
                      <span className={`badge ${summary.testResults.tTest.isSignificant ? 'badge-success' : 'badge-warning'}`}>
                        {summary.testResults.tTest.isSignificant ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{Math.abs(summary.testResults.tTest.effectSize).toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td>Chi-Square</td>
                    <td>{summary.testResults.chiSquare.pValue < 0.001 ? '< 0.001' : summary.testResults.chiSquare.pValue.toFixed(4)}</td>
                    <td>{summary.testResults.chiSquare.confidence.toFixed(1)}%</td>
                    <td>
                      <span className={`badge ${summary.testResults.chiSquare.isSignificant ? 'badge-success' : 'badge-warning'}`}>
                        {summary.testResults.chiSquare.isSignificant ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{Math.abs(summary.testResults.chiSquare.effectSize).toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td>Fisher's Exact</td>
                    <td>{summary.testResults.fisher.pValue < 0.001 ? '< 0.001' : summary.testResults.fisher.pValue.toFixed(4)}</td>
                    <td>{summary.testResults.fisher.confidence.toFixed(1)}%</td>
                    <td>
                      <span className={`badge ${summary.testResults.fisher.isSignificant ? 'badge-success' : 'badge-warning'}`}>
                        {summary.testResults.fisher.isSignificant ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{Math.abs(summary.testResults.fisher.effectSize).toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ABTestStatistics;
