// Theme utility functions for styled-components
// Provides easy access to CSS variables defined in index.css

/**
 * Get CSS variable value for use in styled-components
 * @param {string} name - The CSS variable name (e.g., '--color-primary')
 * @returns {string} The var() CSS function
 */
export const cssVar = (name) => `var(${name})`;

/**
 * Color shortcuts - commonly used colors
 */
export const colors = {
  background: () => cssVar('--color-background'),
  surface: () => cssVar('--color-surface'),
  surfaceHover: () => cssVar('--color-surface-hover'),
  primary: () => cssVar('--color-primary'),
  primaryHover: () => cssVar('--color-primary-hover'),
  secondary: () => cssVar('--color-secondary'),
  secondaryHover: () => cssVar('--color-secondary-hover'),
  text: () => cssVar('--color-text'),
  textSecondary: () => cssVar('--color-text-secondary'),
  textMuted: () => cssVar('--color-text-muted'),
  border: () => cssVar('--color-border'),
  borderLight: () => cssVar('--color-border-light'),
  borderFocus: () => cssVar('--color-border-focus'),
  success: () => cssVar('--color-success'),
  successHover: () => cssVar('--color-success-hover'),
  warning: () => cssVar('--color-warning'),
  warningHover: () => cssVar('--color-warning-hover'),
  error: () => cssVar('--color-error'),
  errorHover: () => cssVar('--color-error-hover'),
  info: () => cssVar('--color-info'),
  infoHover: () => cssVar('--color-info-hover'),
};

/**
 * Spacing shortcuts
 */
export const spacing = {
  xs: () => cssVar('--spacing-xs'),
  sm: () => cssVar('--spacing-sm'),
  md: () => cssVar('--spacing-md'),
  lg: () => cssVar('--spacing-lg'),
  xl: () => cssVar('--spacing-xl'),
  xxl: () => cssVar('--spacing-xxl'),
};

/**
 * Border radius shortcuts
 */
export const radius = {
  sm: () => cssVar('--radius-sm'),
  md: () => cssVar('--radius-md'),
  lg: () => cssVar('--radius-lg'),
  xl: () => cssVar('--radius-xl'),
  full: () => cssVar('--radius-full'),
};

/**
 * Transition shortcuts
 */
export const transition = {
  fast: () => cssVar('--transition-fast'),
  base: () => cssVar('--transition-base'),
  slow: () => cssVar('--transition-slow'),
};

/**
 * Gradient shortcuts
 */
export const gradients = {
  primary: () => cssVar('--gradient-primary'),
  primaryHover: () => cssVar('--gradient-primary-hover'),
};

/**
 * Font size shortcuts
 */
export const fontSize = {
  xs: () => cssVar('--font-size-xs'),
  sm: () => cssVar('--font-size-sm'),
  base: () => cssVar('--font-size-base'),
  lg: () => cssVar('--font-size-lg'),
  xl: () => cssVar('--font-size-xl'),
  '2xl': () => cssVar('--font-size-2xl'),
  '3xl': () => cssVar('--font-size-3xl'),
  '4xl': () => cssVar('--font-size-4xl'),
};

/**
 * Mixin for common card styles
 */
export const cardMixin = `
  background: ${colors.surface()};
  border: 1px solid ${colors.border()};
  border-radius: ${radius.lg()};
  padding: ${spacing.xl()};
  transition: box-shadow ${transition.base()};

  &:hover {
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

/**
 * Mixin for common button styles
 */
export const buttonMixin = `
  padding: 0.75rem 1.5rem;
  background: ${colors.surface()};
  border: 1px solid ${colors.border()};
  border-radius: ${radius.md()};
  color: ${colors.text()};
  font-weight: 500;
  cursor: pointer;
  transition: all ${transition.base()};

  &:hover {
    background: ${colors.primary()};
    border-color: ${colors.primary()};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

/**
 * Mixin for input styles
 */
export const inputMixin = `
  background: ${colors.surface()};
  border: 1px solid ${colors.border()};
  border-radius: ${radius.md()};
  color: ${colors.text()};
  padding: ${spacing.sm()} ${spacing.md()};
  transition: border-color ${transition.base()};

  &:focus {
    outline: none;
    border-color: ${colors.borderFocus()};
  }

  &::placeholder {
    color: ${colors.textSecondary()};
  }
`;

export default {
  cssVar,
  colors,
  spacing,
  radius,
  transition,
  gradients,
  fontSize,
  cardMixin,
  buttonMixin,
  inputMixin,
};
