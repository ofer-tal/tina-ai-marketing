import React from 'react';
import styled, { keyframes } from 'styled-components';

// Keyframe animations for different spinner styles
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

const dotDelay = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

// Main spinner container
const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.$text ? '1rem' : '0'};
  padding: ${props => {
    if (props.$size === 'small') return '0.5rem';
    if (props.$size === 'large') return '3rem';
    return '1.5rem';
  }};
`;

// Circular spinner (default)
const CircularSpinner = styled.div`
  width: ${props => {
    if (props.$size === 'small') return '20px';
    if (props.$size === 'large') return '60px';
    return '40px';
  }};
  height: ${props => {
    if (props.$size === 'small') return '20px';
    if (props.$size === 'large') return '60px';
    return '40px';
  }};
  border: ${props => {
    if (props.$size === 'small') return '2px';
    if (props.$size === 'large') return '4px';
    return '3px';
  }} solid transparent;
  border-top-color: ${props => props.$color || '#e94560'};
  border-right-color: ${props => props.$color || '#e94560'};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

// Dots spinner
const DotsContainer = styled.div`
  display: flex;
  gap: ${props => {
    if (props.$size === 'small') return '4px';
    if (props.$size === 'large') return '12px';
    return '8px';
  }};
`;

const Dot = styled.div`
  width: ${props => {
    if (props.$size === 'small') return '8px';
    if (props.$size === 'large') return '16px';
    return '12px';
  }};
  height: ${props => {
    if (props.$size === 'small') return '8px';
    if (props.$size === 'large') return '16px';
    return '12px';
  }};
  background-color: ${props => props.$color || '#e94560'};
  border-radius: 50%;
  animation: ${bounce} 1.4s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
`;

// Bar spinner
const BarsContainer = styled.div`
  display: flex;
  gap: ${props => {
    if (props.$size === 'small') return '3px';
    if (props.$size === 'large') return '8px';
    return '5px';
  }};
  align-items: center;
`;

const Bar = styled.div`
  width: ${props => {
    if (props.$size === 'small') return '3px';
    if (props.$size === 'large') return '8px';
    return '5px';
  }};
  height: ${props => {
    if (props.$size === 'small') return '20px';
    if (props.$size === 'large') return '50px';
    return '35px';
  }};
  background-color: ${props => props.$color || '#e94560'};
  border-radius: 2px;
  animation: ${pulse} 1.2s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
`;

// Pulse spinner
const PulseSpinner = styled.div`
  width: ${props => {
    if (props.$size === 'small') return '20px';
    if (props.$size === 'large') return '60px';
    return '40px';
  }};
  height: ${props => {
    if (props.$size === 'small') return '20px';
    if (props.$size === 'large') return '60px';
    return '40px';
  }};
  background-color: ${props => props.$color || '#e94560'};
  border-radius: 50%;
  animation: ${pulse} 1.5s ease-in-out infinite;
  opacity: 0.6;
`;

// Loading text
const LoadingText = styled.p`
  color: ${props => props.$color || '#a0a0a0'};
  font-size: ${props => {
    if (props.$size === 'small') return '0.75rem';
    if (props.$size === 'large') return '1.1rem';
    return '0.875rem';
  }};
  margin: 0;
  font-weight: 500;
  text-align: center;
`;

// Inline spinner (for buttons)
const InlineSpinner = styled.span`
  display: inline-block;
  width: ${props => {
    if (props.$size === 'small') return '12px';
    if (props.$size === 'large') return '20px';
    return '16px';
  }};
  height: ${props => {
    if (props.$size === 'small') return '12px';
    if (props.$size === 'large') return '20px';
    return '16px';
  }};
  border: ${props => {
    if (props.$size === 'small') return '1.5px';
    if (props.$size === 'large') return '2.5px';
    return '2px';
  }} solid transparent;
  border-top-color: ${props => props.$color || '#ffffff'};
  border-right-color: ${props => props.$color || '#ffffff'};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  margin-right: 0.5rem;
`;

// Overlay for full-page loading
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(26, 26, 46, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
`;

/**
 * LoadingSpinner Component
 *
 * A versatile loading indicator component with multiple styles and sizes.
 *
 * @param {string} variant - Style variant: 'circular' (default), 'dots', 'bars', 'pulse'
 * @param {string} size - Size: 'small', 'medium' (default), 'large'
 * @param {string} text - Optional text to display below spinner
 * @param {string} color - Color (hex or CSS color name). Default: #e94560 (primary)
 * @param {boolean} inline - Show inline spinner for buttons
 * @param {boolean} overlay - Show as full-page overlay
 * @param {string} className - Additional CSS class
 */
const LoadingSpinner = ({
  variant = 'circular',
  size = 'medium',
  text,
  color = '#e94560',
  inline = false,
  overlay = false,
  className
}) => {
  // Inline spinner for buttons
  if (inline) {
    return <InlineSpinner $size={size} $color={color} className={className} />;
  }

  // Render the appropriate spinner variant
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <DotsContainer $size={size}>
            <Dot $size={size} $color={color} $delay={0} />
            <Dot $size={size} $color={color} $delay={0.2} />
            <Dot $size={size} $color={color} $delay={0.4} />
          </DotsContainer>
        );

      case 'bars':
        return (
          <BarsContainer $size={size}>
            <Bar $size={size} $color={color} $delay={0} />
            <Bar $size={size} $color={color} $delay={0.1} />
            <Bar $size={size} $color={color} $delay={0.2} />
            <Bar $size={size} $color={color} $delay={0.3} />
            <Bar $size={size} $color={color} $delay={0.4} />
          </BarsContainer>
        );

      case 'pulse':
        return <PulseSpinner $size={size} $color={color} />;

      case 'circular':
      default:
        return <CircularSpinner $size={size} $color={color} />;
    }
  };

  const content = (
    <SpinnerContainer $size={size} $text={text} className={className}>
      {renderSpinner()}
      {text && <LoadingText $size={size} $color={color}>{text}</LoadingText>}
    </SpinnerContainer>
  );

  // Full-page overlay
  if (overlay) {
    return <Overlay>{content}</Overlay>;
  }

  return content;
};

export default LoadingSpinner;
