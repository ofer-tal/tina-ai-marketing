import React from 'react';
import styled from 'styled-components';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const ChartContainer = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h3`
  font-size: 1.25rem;
  margin: 0;
  color: #eaeaea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChartSubtitle = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
`;

const CustomTooltip = styled(({ active, payload, label, className }) => {
  if (active && payload && payload.length) {
    return (
      <div className={className}>
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
})`
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  .tooltip-label {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: #eaeaea;
    border-bottom: 1px solid #2d3561;
    padding-bottom: 0.5rem;
  }

  .tooltip-value {
    margin: 0.25rem 0;
    font-size: 0.8rem;
    font-weight: 500;
  }
`;

/**
 * MetricsChart Component
 *
 * Displays interactive charts with hover tooltips for dashboard metrics.
 * Supports line, area, and bar chart types.
 *
 * @param {Object} props
 * @param {string} props.type - Chart type: 'line', 'area', or 'bar'
 * @param {Array} props.data - Array of data objects to display
 * @param {string} props.title - Chart title
 * @param {string} props.subtitle - Chart subtitle (optional)
 * @param {string} props.xKey - Key for X-axis data
 * @param {Array} props.lines - Array of line configurations: { key, name, color }
 * @param {string} props.height - Chart height (default: '300px')
 */
function MetricsChart({
  type = 'line',
  data = [],
  title = '',
  subtitle = '',
  xKey = 'name',
  lines = [],
  height = 300
}) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <ChartTitle>{title}</ChartTitle>
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#a0a0a0'
        }}>
          No data available for {title.toLowerCase()}
        </div>
      </ChartContainer>
    );
  }

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              {lines.map((line, index) => (
                <linearGradient
                  key={index}
                  id={`gradient-${line.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
            <XAxis
              dataKey={xKey}
              stroke="#a0a0a0"
              style={{ fontSize: '0.8rem' }}
            />
            <YAxis
              stroke="#a0a0a0"
              style={{ fontSize: '0.8rem' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.85rem', color: '#eaeaea' }}
            />
            {lines.map((line, index) => (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                fillOpacity={1}
                fill={`url(#gradient-${line.key})`}
                strokeWidth={2}
                animationDuration={1000}
                animationBegin={index * 100}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
            <XAxis
              dataKey={xKey}
              stroke="#a0a0a0"
              style={{ fontSize: '0.8rem' }}
            />
            <YAxis
              stroke="#a0a0a0"
              style={{ fontSize: '0.8rem' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.85rem', color: '#eaeaea' }}
            />
            {lines.map((line, index) => (
              <Bar
                key={line.key}
                dataKey={line.key}
                name={line.name}
                fill={line.color}
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
                animationBegin={index * 100}
              />
            ))}
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
            <XAxis
              dataKey={xKey}
              stroke="#a0a0a0"
              style={{ fontSize: '0.8rem' }}
            />
            <YAxis
              stroke="#a0a0a0"
              style={{ fontSize: '0.8rem' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.85rem', color: '#eaeaea' }}
            />
            {lines.map((line, index) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
                animationBegin={index * 100}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <ChartContainer>
      {title && (
        <ChartHeader>
          <div>
            <ChartTitle>{title}</ChartTitle>
            {subtitle && <ChartSubtitle>{subtitle}</ChartSubtitle>}
          </div>
        </ChartHeader>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export default MetricsChart;
