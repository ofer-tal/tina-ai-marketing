import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#0ea5e9', '#f8312f', '#8b5cf6', '#ec4899'];

const TIER_COLORS = {
  'S-Tier': '#00d26a',
  'A-Tier': '#0ea5e9',
  'B-Tier': '#ffb020',
  'C-Tier': '#f8312f',
  'D-Tier': '#6b7280'
};

const TREND_COLORS = {
  'rising': '#00d26a',
  'falling': '#f8312f',
  'stable': '#ffb020'
};

export default function HashtagAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [platform, setPlatform] = useState('all');
  const [selectedHashtag, setSelectedHashtag] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalysis();
  }, [platform]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = platform === 'all'
        ? 'http://localhost:3001/api/hashtag-effectiveness/analyze'
        : `http://localhost:3001/api/hashtag-effectiveness/analyze?platform=${platform}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setAnalysis(data.data);
      } else {
        setError(typeof data.message === 'string' ? data.message : 'Failed to fetch analysis');
      }
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagClick = (hashtag) => {
    setSelectedHashtag(selectedHashtag?.hashtag === hashtag.hashtag ? null : hashtag);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
          <div className="h-64 bg-gray-700 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No hashtag data available</p>
        </div>
      </div>
    );
  }

  const summary = analysis.summary || {};
  const recommendations = analysis.hashtags || [];
  const trending = analysis.trending || {};
  const rising = trending.rising || [];
  const falling = trending.falling || [];

  // Extract all hashtags from recommendations
  const coreRec = recommendations.find(r => r.type === 'core');
  const growthRec = recommendations.find(r => r.type === 'growth');
  const varietyRec = recommendations.find(r => r.type === 'variety');
  const avoidRec = recommendations.find(r => r.type === 'avoid');
  const strategyRec = recommendations.find(r => r.type === 'strategy');
  const platformRec = recommendations.find(r => r.type === 'platform');

  const allHashtags = [
    ...(coreRec?.hashtags || []).map(h => ({ hashtag: h, category: 'Core', tier: 'S-Tier' })),
    ...(growthRec?.hashtags || []).map(h => ({ hashtag: h, category: 'Growth', tier: 'A-Tier' })),
    ...(varietyRec?.hashtags || []).map(h => ({ hashtag: h, category: 'Variety', tier: 'B-Tier' })),
    ...(avoidRec?.hashtags || []).map(h => ({ hashtag: h, category: 'Avoid', tier: 'D-Tier' }))
  ];

  // Prepare chart data
  const effectivenessData = allHashtags.map((h, i) => ({
    name: h.hashtag,
    score: Math.random() * 100, // Placeholder - will be replaced with real data
    category: h.category
  }));

  const trendingData = [...rising.slice(0, 5), ...falling.slice(0, 5)].map(h => ({
    name: h.hashtag,
    strength: h.trendStrength || 0,
    direction: h.trendDirection || 'stable'
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">#️⃣ Hashtag Analytics</h1>
          <p className="text-gray-400">Track and analyze hashtag performance</p>
        </div>
        <div className="flex gap-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
          >
            <option value="all">All Platforms</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube_shorts">YouTube Shorts</option>
          </select>
          <button
            onClick={fetchAnalysis}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Hashtags</div>
          <div className="text-2xl font-bold text-white">{summary.totalAnalyzed || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Analyzed across all posts</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Core Performers</div>
          <div className="text-2xl font-bold text-green-400">{summary.core || 0}</div>
          <div className="text-xs text-gray-500 mt-1">S-Tier & A-Tier hashtags</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Rising Trends</div>
          <div className="text-2xl font-bold text-blue-400">{rising.length}</div>
          <div className="text-xs text-gray-500 mt-1">Trending upward</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">To Avoid</div>
          <div className="text-2xl font-bold text-red-400">{summary.avoid || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Low-performing hashtags</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-4 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`py-2 px-4 border-b-2 transition-colors ${
              activeTab === 'trending'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-2 px-4 border-b-2 transition-colors ${
              activeTab === 'recommendations'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Recommendations
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Effectiveness Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Hashtag Effectiveness</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={effectivenessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
                <Bar dataKey="score" name="Effectiveness Score" fill="#e94560" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hashtag Rankings Table */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Hashtag Rankings</h2>
            <div className="space-y-2">
              {allHashtags.map((hashtag, index) => (
                <div
                  key={index}
                  onClick={() => hashtag.category !== 'Avoid' && handleHashtagClick(hashtag)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    hashtag.category === 'Avoid'
                      ? 'bg-red-900/20 border-red-500/30'
                      : 'bg-gray-700/50 border-gray-600 hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        hashtag.category === 'Core' ? 'bg-green-500/20 text-green-400' :
                        hashtag.category === 'Growth' ? 'bg-blue-500/20 text-blue-400' :
                        hashtag.category === 'Variety' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">#{hashtag.hashtag}</div>
                        <div className="text-sm text-gray-400">{hashtag.category} • {hashtag.tier}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{hashtag.tier}</div>
                      <div className={`text-sm ${
                        hashtag.category === 'Core' ? 'text-green-400' :
                        hashtag.category === 'Growth' ? 'text-blue-400' :
                        hashtag.category === 'Variety' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {hashtag.category === 'Avoid' ? 'Avoid' : 'Use'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform-specific Strategy */}
          {platformRec && platformRec.platforms && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Platform-Specific Strategy</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {platformRec.platforms.map((platform, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="text-lg font-bold text-white mb-2 capitalize">
                      {platform.platform === 'youtube_shorts' ? 'YouTube Shorts' : platform.platform}
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      Avg Effectiveness: <span className="text-white">{platform.avgEffectiveness?.toFixed(1) || 0}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {platform.topHashtags?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trending Tab */}
      {activeTab === 'trending' && (
        <div className="space-y-6">
          {/* Rising Hashtags */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">📈 Rising Hashtags</h2>
            {rising.length === 0 ? (
              <p className="text-gray-400">No rising hashtags detected in the current period</p>
            ) : (
              <div className="space-y-3">
                {rising.map((hashtag, index) => (
                  <div key={index} className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-lg">#{hashtag.hashtag}</div>
                        <div className="text-sm text-gray-400">
                          {hashtag.postCount} posts • {hashtag.recentPostCount} recent
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">+{hashtag.trendStrength?.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">Trend Strength</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Views:</span>{' '}
                        <span className="text-white">{hashtag.avgViews?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Engagement:</span>{' '}
                        <span className="text-white">{hashtag.engagementScore?.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Effectiveness:</span>{' '}
                        <span className="text-white">{hashtag.effectivenessScore?.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Falling Hashtags */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">📉 Falling Hashtags</h2>
            {falling.length === 0 ? (
              <p className="text-gray-400">No declining hashtags detected in the current period</p>
            ) : (
              <div className="space-y-3">
                {falling.map((hashtag, index) => (
                  <div key={index} className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-lg">#{hashtag.hashtag}</div>
                        <div className="text-sm text-gray-400">
                          {hashtag.postCount} posts • {hashtag.recentPostCount} recent
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">-{hashtag.trendStrength?.toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">Trend Strength</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Views:</span>{' '}
                        <span className="text-white">{hashtag.avgViews?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Engagement:</span>{' '}
                        <span className="text-white">{hashtag.engagementScore?.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Effectiveness:</span>{' '}
                        <span className="text-white">{hashtag.effectivenessScore?.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {recommendations.map((rec, index) => (
            <div key={index} className={`bg-gray-800 rounded-lg p-6 border ${
              rec.priority === 'high' ? 'border-green-500/50' :
              rec.priority === 'medium' ? 'border-yellow-500/50' :
              'border-gray-700'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{rec.title}</h3>
                  <p className="text-gray-400">{rec.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  rec.priority === 'high' ? 'bg-green-500/20 text-green-400' :
                  rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {rec.priority}
                </span>
              </div>

              {rec.hashtags && (
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">Hashtags:</div>
                  <div className="flex flex-wrap gap-2">
                    {rec.hashtags.map((tag, i) => (
                      <span key={i} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {rec.optimalCount && (
                <div className="mb-4 bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Optimal Hashtag Count per Post</div>
                  <div className="text-white font-bold text-lg">
                    {rec.optimalCount.min} - {rec.optimalCount.max} hashtags
                  </div>
                  {rec.currentAvg !== undefined && (
                    <div className="text-sm text-gray-400 mt-1">
                      Current average: {rec.currentAvg} hashtags/post
                    </div>
                  )}
                </div>
              )}

              <div className="text-sm text-gray-400">
                <strong className="text-white">Reasoning:</strong> {rec.reasoning}
              </div>

              <div className="mt-4 flex gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Impact:</span>{' '}
                  <span className={`font-medium ${
                    rec.impact === 'High' ? 'text-green-400' :
                    rec.impact === 'Medium' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>{rec.impact}</span>
                </div>
                <div>
                  <span className="text-gray-400">Effort:</span>{' '}
                  <span className="text-white">{rec.effort}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hashtag Detail Modal */}
      {selectedHashtag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">#{selectedHashtag.hashtag}</h2>
              <button
                onClick={() => setSelectedHashtag(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Category</div>
                  <div className="text-white font-medium">{selectedHashtag.category}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Tier</div>
                  <div className="text-white font-medium">{selectedHashtag.tier}</div>
                </div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <div className="text-sm text-gray-400 mb-1">Recommendation</div>
                <div className="text-white">
                  {selectedHashtag.category === 'Core'
                    ? 'Use this hashtag consistently in every post for best results'
                    : selectedHashtag.category === 'Growth'
                    ? 'Test this hashtag to capitalize on upward trends'
                    : selectedHashtag.category === 'Variety'
                    ? 'Rotate this hashtag for audience diversity'
                    : 'Avoid using this hashtag - low performance detected'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
