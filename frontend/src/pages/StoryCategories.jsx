import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#0ea5e9', '#f8312f'];

export default function StoryCategories() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [platform, setPlatform] = useState('all');

  useEffect(() => {
    fetchAnalysis();
  }, [platform]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = platform === 'all'
        ? 'http://localhost:3001/api/story-category-analysis/analyze'
        : `http://localhost:3001/api/story-category-analysis/platform/${platform}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setAnalysis(data.data || data);
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Failed to fetch analysis');
      }
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(selectedCategory?.category === category.category ? null : category);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
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

  if (!analysis || !analysis.rankedCategories) {
    return (
      <div className="p-6">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No category data available</p>
        </div>
      </div>
    );
  }

  const categories = analysis.rankedCategories;
  const topPerformer = categories[0];
  const bottomPerformer = categories[categories.length - 1];
  const insights = analysis.insights || [];
  const recommendations = analysis.recommendations || [];

  // Prepare chart data
  const chartData = categories.map(cat => ({
    name: cat.category,
    views: cat.averages.views,
    engagementRate: cat.calculatedEngagementRate,
    viralityScore: cat.viralityScore
  }));

  // Prepare pie chart data
  const pieData = categories.slice(0, 6).map(cat => ({
    name: cat.category,
    value: cat.totals.views,
    percentage: parseFloat((cat.totals.views / categories.reduce((sum, c) => sum + c.totals.views, 0) * 100).toFixed(1))
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Story Category Analysis</h1>
          <p className="text-gray-400 mt-1">Identify which story categories perform best</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Platform Filter */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Platforms</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube_shorts">YouTube Shorts</option>
          </select>
          <button
            onClick={fetchAnalysis}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Categories</p>
          <p className="text-2xl font-bold text-white mt-1">{analysis.summary?.totalCategories || categories.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-green-500/50">
          <p className="text-gray-400 text-sm">Top Category</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{topPerformer.category}</p>
          <p className="text-sm text-gray-400 mt-1">{topPerformer.averages.views.toLocaleString()} avg views</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-red-500/50">
          <p className="text-gray-400 text-sm">Lowest Category</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{bottomPerformer.category}</p>
          <p className="text-sm text-gray-400 mt-1">{bottomPerformer.averages.views.toLocaleString()} avg views</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-purple-500/50">
          <p className="text-gray-400 text-sm">Performance Gap</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{analysis.summary?.performanceGap?.viewsPercentage.toFixed(0)}%</p>
          <p className="text-sm text-gray-400 mt-1">view difference</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Bar Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Average Views by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="views" fill="#e94560" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Rate Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Engagement Rate by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="engagementRate" fill="#7b2cbf" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Virality Score Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Virality Score by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="viralityScore" fill="#00d26a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Views Distribution Pie Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Views Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value) => value.toLocaleString()}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Rankings Table */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Category Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Posts</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Avg Views</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Engagement</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Virality Score</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Percentile</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.category}
                  onClick={() => handleCategoryClick(category)}
                  className={`border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    category.rank === 1 ? 'bg-green-900/10' : ''
                  } ${selectedCategory?.category === category.category ? 'bg-purple-900/20' : ''}`}
                >
                  <td className="py-3 px-4">
                    <span className={`font-bold ${
                      category.rank === 1 ? 'text-green-400' :
                      category.rank === categories.length ? 'text-red-400' :
                      'text-white'
                    }`}>
                      #{category.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white">{category.category}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{category.postCount}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{category.averages.views.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{category.calculatedEngagementRate.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right text-gray-300">{category.viralityScore.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded text-sm ${
                      category.percentile >= 80 ? 'bg-green-900/30 text-green-400' :
                      category.percentile >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {category.percentile}th
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Category Details */}
        {selectedCategory && (
          <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">{selectedCategory.category} - Detailed Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Views</p>
                <p className="text-xl font-bold text-white">{selectedCategory.totals.views.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Likes</p>
                <p className="text-xl font-bold text-white">{selectedCategory.totals.likes.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Comments</p>
                <p className="text-xl font-bold text-white">{selectedCategory.totals.comments.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Shares</p>
                <p className="text-xl font-bold text-white">{selectedCategory.totals.shares.toLocaleString()}</p>
              </div>
            </div>

            {/* Platform Breakdown */}
            {selectedCategory.platformAverages && Object.keys(selectedCategory.platformAverages).length > 0 && (
              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">Platform Performance</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedCategory.platformAverages).map(([platform, data]) => (
                    <div key={platform} className="bg-gray-800 px-3 py-2 rounded border border-gray-700">
                      <p className="text-white font-medium capitalize">{platform.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-400">{data.avgViews.toLocaleString()} avg views</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Insights</h2>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.priority === 'high' ? 'bg-red-900/20 border-red-500/30' :
                  insight.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-500/30' :
                  'bg-blue-900/20 border-blue-500/30'
                }`}
              >
                <h3 className="text-white font-medium">{insight.title}</h3>
                <p className="text-gray-300 mt-1">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Recommendations</h2>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  rec.priority === 'high' ? 'bg-green-900/20 border-green-500/30' :
                  'bg-blue-900/20 border-blue-500/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{rec.action}</h3>
                    <p className="text-gray-300 mt-1">{rec.rationale}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                      <span className="text-green-400">✓ {rec.expectedImpact}</span>
                      <span className="text-blue-400">⚡ {rec.effort} effort</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    rec.priority === 'high' ? 'bg-green-900/50 text-green-400' :
                    'bg-blue-900/50 text-blue-400'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
