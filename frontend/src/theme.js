// Blush Marketing Dark Theme Configuration
// Based on app_spec.txt design system

export const darkTheme = {
  // Background colors
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceHover: '#1f2b4d',

  // Accent colors
  primary: '#e94560', // Red/pink blush brand color
  primaryHover: '#d63d56',
  secondary: '#7b2cbf', // Purple
  secondaryHover: '#6a25a8',

  // Text colors
  text: '#eaeaea', // Off-white
  textSecondary: '#a0a0a0', // Gray
  textMuted: '#6b7280',

  // Status colors
  success: '#00d26a', // Green
  successHover: '#00b85d',
  warning: '#ffb020', // Yellow/orange
  warningHover: '#e6a21c',
  error: '#f8312f', // Red
  errorHover: '#e02c2a',
  info: '#3b82f6', // Blue
  infoHover: '#2563eb',

  // Border colors
  border: '#2d3561', // Muted blue-purple
  borderLight: '#3d4561',
  borderFocus: '#e94560',

  // Gradients
  gradient: 'linear-gradient(135deg, #e94560 0%, #7b2cbf 100%)',
  gradientHover: 'linear-gradient(135deg, #d63d56 0%, #6a25a8 100%)',

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },

  // Border radius
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glow: '0 4px 20px rgba(233, 69, 96, 0.1)',
  },

  // Typography
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  fontFamilyMono: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',

  // Font sizes
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },

  // Transitions
  transition: {
    fast: '0.1s ease',
    base: '0.2s ease',
    slow: '0.3s ease',
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

export default darkTheme;
