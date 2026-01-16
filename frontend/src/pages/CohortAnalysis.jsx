import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CohortAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channelFilter, setChannelFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [channelFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (channelFilter) params.append('channel', channelFilter);

      const response = await fetch(`http://localhost:3001/api/cohort-analysis/analyze?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load cohort analysis');
      }
    } catch (err) {
      console.error('Error fetching cohort analysis:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const getColorForRetentionRate = (rate, min, max) => {
    if (max === min || !rate) return 'rgba(99, 102, 241, 0.3)';

    const normalized = (rate - min) / (max - min);

    if (normalized < 0.33) {
      return `rgba(239, 68, 68, ${0.3 + normalized * 0.4})`;
    } else if (normalized < 0.66) {
      return `rgba(245, 158, 11, ${0.3 + (normalized - 0.33) * 0.4})`;
    } else {
      return `rgba(16, 185, 129, ${0.3 + (normalized - 0.66) * 0.4})`;
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 py-20">
        Loading cohort analysis...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
          {error}
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.heatmap) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Cohort Analysis</h1>
        <p className="text-gray-400">No cohort data available</p>
      </div>
    );
  }

  const { summary, heatmap, metrics, trends } = data;

  // Prepare retention trend data
  const retentionTrendData = metrics.averageRetentionByPeriod
    ?.filter(p => p.period > 0 && p.period <= 12)
    .map(p => ({
      month: `M${p.period}`,
      retention: parseFloat(p.averageRetentionRate)
    })) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Cohort Analysis</h1>
        <p className="text-gray-400 text-sm">Track user retention by acquisition cohort</p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Channels</option>
          <option value="organic">Organic</option>
          <option value="apple_search_ads">Apple Search Ads</option>
          <option value="tiktok_ads">TikTok Ads</option>
          <option value="instagram_ads">Instagram Ads</option>
          <option value="google_ads">Google Ads</option>
        </select>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-400 text-xs mb-2">Total Cohorts</p>
          <p className="text-white text-3xl font-bold mb-1">{summary.totalCohorts}</p>
          <p className="text-gray-400 text-xs">Acquisition periods</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-400 text-xs mb-2">Total Users</p>
          <p className="text-white text-3xl font-bold mb-1">{summary.totalUsers?.toLocaleString() || 0}</p>
          <p className="text-gray-400 text-xs">Analyzed across cohorts</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-400 text-xs mb-2">Month 1 Retention</p>
          <p className="text-white text-3xl font-bold mb-1">{summary.overallRetention?.month1 || 0}%</p>
          <p className="text-gray-400 text-xs">Average across cohorts</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-400 text-xs mb-2">Month 3 Retention</p>
          <p className="text-white text-3xl font-bold mb-1">{summary.overallRetention?.month3 || 0}%</p>
          <p className="text-gray-400 text-xs">Early retention indicator</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-400 text-xs mb-2">Month 6 Retention</p>
          <p className="text-white text-3xl font-bold mb-1">{summary.overallRetention?.month6 || 0}%</p>
          <p className="text-gray-400 text-xs">Medium-term retention</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-400 text-xs mb-2">Month 12 Retention</p>
          <p className="text-white text-3xl font-bold mb-1">{summary.overallRetention?.month12 || 0}%</p>
          <p className="text-gray-400 text-xs">Long-term retention</p>
        </div>
      </div>

      {/* Retention Trend Chart */}
      {retentionTrendData.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-white mb-5">Retention Trend (First 12 Months)</h3>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={retentionTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  label={{ value: 'Retention Rate (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                  formatter={(value) => [`${value}%`, 'Retention']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="retention"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cohort Retention Heatmap */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold text-white mb-5">Cohort Retention Heatmap</h3>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-900 z-10">
              <tr>
                <th className="p-3 text-left bg-gray-900 text-gray-400 font-semibold">Cohort</th>
                {heatmap.periods.slice(0, 13).map((period, idx) => (
                  <th key={idx} className="p-2 min-w-[70px] bg-gray-900 text-gray-400 font-semibold text-xs">
                    {period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.cohorts.slice(-12).reverse().map((cohort, cohortIdx) => (
                <tr key={cohortIdx}>
                  <td className="p-3 text-left font-semibold text-white bg-gray-900 border border-gray-800 sticky left-0 z-10">
                    <div>{cohort.cohortDate}</div>
                    <div className="text-xs font-normal text-gray-400">
                      {cohort.userCount} users
                    </div>
                  </td>
                  {cohort.retentionData.slice(0, 13).map((data, periodIdx) => (
                    <td
                      key={periodIdx}
                      className="p-3 text-center border border-gray-800 font-semibold min-w-[70px] hover:scale-105 transition-transform cursor-help"
                      style={{
                        backgroundColor: data.hasData && periodIdx > 0
                          ? getColorForRetentionRate(
                              data.retentionRate,
                              heatmap.statistics.minRetention,
                              heatmap.statistics.maxRetention
                            )
                          : 'transparent',
                        color: '#ffffff'
                      }}
                      title={`${data.retainedUsers} users (${data.retentionRate}%)`}
                    >
                      {data.period === 0 ? '100%' :
                       data.hasData ? `${data.retentionRate}%` : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trends & Insights */}
      {trends && (trends.overall?.length > 0 || trends.byPeriod?.length > 0) && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-5">Trends & Insights</h2>

          {trends.overall && trends.overall.length > 0 && (
            <>
              {trends.overall.map((trend, idx) => (
                <div
                  key={idx}
                  className="mb-3 p-4 bg-gray-900 rounded-lg border-l-4"
                  style={{
                    borderColor: trend.impact === 'positive' ? '#10b981' :
                                trend.impact === 'negative' ? '#ef4444' :
                                '#6366f1'
                  }}
                >
                  <h4 className="text-white font-semibold text-sm mb-2">
                    {trend.metric}: {trend.type === 'improving' ? '📈 Improving' : '📉 Declining'}
                  </h4>
                  <p className="text-gray-400 text-sm mb-2">{trend.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Magnitude: {trend.magnitude}%</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {trends.byPeriod && trends.byPeriod.length > 0 && (
            <>
              {trends.byPeriod.map((trend, idx) => (
                <div
                  key={idx}
                  className="mb-3 p-4 bg-gray-900 rounded-lg border-l-4"
                  style={{
                    borderColor: trend.priority === 'high' ? '#ef4444' :
                                trend.priority === 'medium' ? '#f59e0b' :
                                '#10b981'
                  }}
                >
                  <h4 className="text-white font-semibold text-sm mb-2">
                    {trend.period} - {trend.type === 'high_churn' ? '⚠️ High Churn' : '⚡ Medium Churn'}
                  </h4>
                  <p className="text-gray-400 text-sm mb-2">{trend.description}</p>
                  <p className="text-gray-400 text-sm">💡 {trend.recommendation}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Recommendations */}
      {trends && trends.recommendations && trends.recommendations.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-5">Recommendations</h2>

          {trends.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="mb-3 p-4 bg-gray-900 rounded-lg border-l-4"
              style={{
                borderColor: rec.priority === 'high' ? '#ef4444' :
                            rec.priority === 'medium' ? '#f59e0b' :
                            '#10b981'
              }}
            >
              <h4 className="text-white font-semibold text-sm mb-2">{rec.area}</h4>
              <p className="text-gray-400 text-sm mb-2">{rec.recommendation}</p>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>🎯 Expected Impact: {rec.expectedImpact}</span>
                <span>⚡ Effort: {rec.effort}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
