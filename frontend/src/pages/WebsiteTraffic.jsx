/**
 * Website Traffic Dashboard
 *
 * Displays website traffic data from Google Analytics:
 * - Traffic trends over time (page views, sessions, users)
 * - Traffic sources breakdown (organic, social, direct, referral, email)
 * - Top pages by page views
 * - User acquisition metrics
 * - Bounce rate and session duration
 *
 * Feature #269: Website traffic tracking from GA
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const COLORS = ['#e94560', '#7b2cbf', '#00d26a', '#ffb020', '#0ea5e9', '#f8312f', '#8b5cf6', '#ec4899'];

const SOURCE_COLORS = {
  'organic': '#00d26a',
  'social': '#0ea5e9',
  'direct': '#ffb020',
  'referral': '#8b5cf6',
  'email': '#ec4899'
};

export default function WebsiteTraffic() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date().toISOString().split('T')[0];
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(
        `http://localhost:3001/api/website-traffic/dashboard?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || 'Failed to fetch traffic data');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('http://localhost:3001/api/website-traffic/refresh', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        // Fetch updated dashboard data
        await fetchDashboardData();
      } else {
        setError(data.error || 'Failed to refresh traffic data');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setRefreshing(false);
    }
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
          <button
            onClick={fetchDashboardData}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No traffic data available</p>
          <p className="text-gray-500 text-sm mt-2">Configure Google Analytics in Settings to start tracking</p>
        </div>
      </div>
    );
  }

  const { trends, sources, topPages, acquisition } = dashboardData;
  const summary = trends?.summary || {};

  // Format daily trends for chart
  const dailyTrendsData = trends?.dailyTrends?.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    pageViews: d.pageViews,
    sessions: d.sessions,
    users: d.users
  })) || [];

  // Format sources for pie chart
  const sourcesData = sources?.sources?.map(s => ({
    name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    value: s.sessions,
    percentage: s.percentage
  })) || [];

  // Format top pages
  const pagesData = topPages?.pages?.slice(0, 10).map(p => ({
    path: p.path,
    views: p.pageViews,
    unique: p.uniqueViews
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🌐 Website Traffic</h1>
          <p className="text-gray-400">Track website traffic from Google Analytics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            {refreshing ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Page Views</p>
              <p className="text-3xl font-bold text-white mt-2">
                {summary.totalPageViews?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-3xl">👁️</div>
          </div>
          <p className="text-gray-500 text-sm mt-2">Across {summary.daysWithData || 0} days</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="text-3xl font-bold text-white mt-2">
                {summary.totalSessions?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-3xl">🖥️</div>
          </div>
          <p className="text-gray-500 text-sm mt-2">User visits</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-white mt-2">
                {summary.totalUsers?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
          <p className="text-gray-500 text-sm mt-2">Unique visitors</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Avg Bounce Rate</p>
              <p className="text-3xl font-bold text-white mt-2">
                {summary.avgBounceRate ? `${summary.avgBounceRate}%` : 'N/A'}
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
          <p className="text-gray-500 text-sm mt-2">Lower is better</p>
        </div>
      </div>

      {/* Traffic Trends Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Traffic Trends Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyTrendsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="pageViews"
              stackId="1"
              stroke="#e94560"
              fill="#e94560"
              fillOpacity={0.6}
              name="Page Views"
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stackId="2"
              stroke="#0ea5e9"
              fill="#0ea5e9"
              fillOpacity={0.6}
              name="Sessions"
            />
            <Area
              type="monotone"
              dataKey="users"
              stackId="3"
              stroke="#00d26a"
              fill="#00d26a"
              fillOpacity={0.6}
              name="Users"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Traffic Sources and Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources Pie Chart */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Traffic Sources</h2>
          {sourcesData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourcesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sourcesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SOURCE_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem'
                    }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {sourcesData.map((source, index) => (
                  <div key={source.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: SOURCE_COLORS[source.name.toLowerCase()] || COLORS[index % COLORS.length]
                        }}
                      ></div>
                      <span className="text-gray-300">{source.name}</span>
                    </div>
                    <span className="text-white font-semibold">{source.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-8">No traffic source data available</p>
          )}
        </div>

        {/* Top Pages */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Top Pages</h2>
          {pagesData.length > 0 ? (
            <div className="space-y-3">
              {pagesData.map((page, index) => (
                <div
                  key={page.path}
                  className="flex justify-between items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-semibold">#{index + 1}</span>
                      <span className="text-white font-mono text-sm">{page.path}</span>
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-gray-400 text-xs">{page.views.toLocaleString()} views</span>
                      <span className="text-gray-500 text-xs">{page.unique.toLocaleString()} unique</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No page data available</p>
          )}
        </div>
      </div>

      {/* User Acquisition */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">User Acquisition</h2>
        {acquisition ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">New Users</p>
              <p className="text-2xl font-bold text-green-400">
                {acquisition.newUsers?.toLocaleString() || '0'}
              </p>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${acquisition.newUsers && acquisition.totalUsers
                      ? (acquisition.newUsers / acquisition.totalUsers * 100).toFixed(0)
                      : 0}%`
                  }}
                ></div>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {acquisition.newUsers && acquisition.totalUsers
                  ? `${(acquisition.newUsers / acquisition.totalUsers * 100).toFixed(1)}%`
                  : '0%'} of total
              </p>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-1">Returning Users</p>
              <p className="text-2xl font-bold text-blue-400">
                {acquisition.returningUsers?.toLocaleString() || '0'}
              </p>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${acquisition.returningUsers && acquisition.totalUsers
                      ? (acquisition.returningUsers / acquisition.totalUsers * 100).toFixed(0)
                      : 0}%`
                  }}
                ></div>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {acquisition.returningUsers && acquisition.totalUsers
                  ? `${(acquisition.returningUsers / acquisition.totalUsers * 100).toFixed(1)}%`
                  : '0%'} of total
              </p>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-purple-400">
                {acquisition.conversionRate ? `${(parseFloat(acquisition.conversionRate) * 100).toFixed(2)}%` : 'N/A'}
              </p>
              <p className="text-gray-500 text-xs mt-2">Users who converted</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No acquisition data available</p>
        )}
      </div>

      {/* Additional Metrics */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Engagement Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-2">Avg Session Duration</p>
            <p className="text-2xl font-bold text-white">
              {summary.avgSessionDuration ? `${Math.floor(summary.avgSessionDuration / 60)}m ${summary.avgSessionDuration % 60}s` : 'N/A'}
            </p>
            <p className="text-gray-500 text-xs mt-1">Time spent on site per session</p>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-2">Pages per Session</p>
            <p className="text-2xl font-bold text-white">
              {summary.totalSessions && summary.totalPageViews
                ? (summary.totalPageViews / summary.totalSessions).toFixed(2)
                : 'N/A'}
            </p>
            <p className="text-gray-500 text-xs mt-1">Average pages viewed per visit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
