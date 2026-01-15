import React from 'react';
import MetricsChart from './MetricsChart';

/**
 * DashboardCharts Component
 *
 * Displays multiple interactive charts for the dashboard.
 * Includes MRR trend, user growth, and engagement metrics.
 */
function DashboardCharts() {
  // Sample data for MRR trend
  const mrrData = [
    { month: 'Jan', mrr: 380, target: 400 },
    { month: 'Feb', mrr: 395, target: 400 },
    { month: 'Mar', mrr: 410, target: 400 },
    { month: 'Apr', mrr: 425, target: 450 },
    { month: 'May', mrr: 440, target: 450 },
    { month: 'Jun', mrr: 425, target: 500 },
  ];

  // Sample data for user growth
  const userGrowthData = [
    { month: 'Jan', newUsers: 180, returning: 520 },
    { month: 'Feb', newUsers: 195, returning: 550 },
    { month: 'Mar', newUsers: 210, returning: 590 },
    { month: 'Apr', newUsers: 225, returning: 620 },
    { month: 'May', newUsers: 240, returning: 650 },
    { month: 'Jun', newUsers: 247, returning: 658 },
  ];

  // Sample data for engagement
  const engagementData = [
    { month: 'Jan', views: 45000, likes: 3200, comments: 180 },
    { month: 'Feb', views: 52000, likes: 3800, comments: 220 },
    { month: 'Mar', views: 58000, likes: 4200, comments: 260 },
    { month: 'Apr', views: 65000, likes: 4800, comments: 310 },
    { month: 'May', views: 72000, likes: 5400, comments: 360 },
    { month: 'Jun', views: 78000, likes: 5900, comments: 410 },
  ];

  // Line configurations
  const mrrLines = [
    { key: 'mrr', name: 'Actual MRR', color: '#e94560' },
    { key: 'target', name: 'Target MRR', color: '#7b2cbf' },
  ];

  const userGrowthLines = [
    { key: 'newUsers', name: 'New Users', color: '#00d26a' },
    { key: 'returning', name: 'Returning Users', color: '#3b82f6' },
  ];

  const engagementLines = [
    { key: 'views', name: 'Views', color: '#7b2cbf' },
    { key: 'likes', name: 'Likes', color: '#e94560' },
    { key: 'comments', name: 'Comments', color: '#ffb020' },
  ];

  return (
    <>
      <MetricsChart
        type="line"
        title="💰 MRR Trend"
        subtitle="Monthly Recurring Revenue over time"
        data={mrrData}
        xKey="month"
        lines={mrrLines}
        height={300}
      />

      <MetricsChart
        type="area"
        title="👥 User Growth"
        subtitle="New vs Returning users"
        data={userGrowthData}
        xKey="month"
        lines={userGrowthLines}
        height={300}
      />

      <MetricsChart
        type="bar"
        title="📊 Engagement Metrics"
        subtitle="Views, likes, and comments over time"
        data={engagementData}
        xKey="month"
        lines={engagementLines}
        height={300}
      />
    </>
  );
}

export default DashboardCharts;
