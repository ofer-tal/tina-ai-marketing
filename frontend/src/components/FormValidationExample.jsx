/**
 * Form Validation Example Component
 *
 * Demonstrates using ErrorAlert for validation errors
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import ErrorAlert from './ErrorAlert.jsx';
import { validateRequired, validateEmail, validateMinLength, validateForm } from '../utils/validation.js';

const Container = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  color: #eaeaea;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #eaeaea;
`;

const Input = styled.input`
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 6px;
  color: #eaeaea;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.1);
  }

  ${props => props.$hasError && `
    border-color: #f8312f;
  `}
`;

const ErrorText = styled.span`
  font-size: 0.75rem;
  color: #f8312f;
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const FormValidationExample = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Clear API error when user makes changes
    if (apiError) {
      setApiError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setApiError(null);

    // Define validation rules for each field
    const validationRules = {
      name: [
        (value) => validateRequired(value),
        (value) => validateMinLength(value, 2)
      ],
      email: [
        (value) => validateRequired(value),
        (value) => validateEmail(value)
      ],
      message: [
        (value) => validateRequired(value),
        (value) => validateMinLength(value, 10)
      ]
    };

    // Validate form
    const { isValid, errors: validationErrors } = validateForm(formData, validationRules);

    if (!isValid) {
      setErrors(validationErrors);

      // Show alert for validation errors
      setApiError({
        type: 'error',
        title: 'Validation Error',
        message: `${Object.keys(validationErrors).length} field(s) need correction`,
        helpText: 'Please fix the highlighted fields and try again.',
        fields: Object.keys(validationErrors)
      });
      return;
    }

    // Simulate API call
    try {
      // Simulate network error
      if (formData.email.includes('error')) {
        throw new Error('Simulated API error for demonstration');
      }

      // Simulate successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setApiError({
        type: 'error',
        title: 'Submission Error',
        message: error.message || 'Failed to submit form',
        helpText: 'Please check your connection and try again. If the problem persists, contact support.',
        actions: [
          { label: 'Retry', onClick: () => handleSubmit(e), variant: 'primary' },
          { label: 'Reset Form', onClick: () => {
            setFormData({ name: '', email: '', message: '' });
            setApiError(null);
            setErrors({});
          }, variant: 'secondary' }
        ]
      });
    }
  };

  return (
    <Container>
      <Title>Form Validation Example</Title>

      {/* Validation Errors Alert */}
      {apiError && apiError.type === 'error' && (
        <ErrorAlert
          type="error"
          title={apiError.title}
          message={apiError.message}
          helpText={apiError.helpText}
          onDismiss={() => setApiError(null)}
          actions={apiError.actions}
        />
      )}

      {/* Success Message */}
      {success && (
        <ErrorAlert
          type="success"
          title="Success!"
          message="Form submitted successfully"
          helpText="Your data has been received and processed."
          onDismiss={() => setSuccess(false)}
        />
      )}

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="name">Name *</Label>
          <Input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            $hasError={!!errors.name}
            placeholder="Enter your name (min 2 characters)"
          />
          {errors.name && <ErrorText>{errors.name}</ErrorText>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email">Email *</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            $hasError={!!errors.email}
            placeholder="Enter your email address"
          />
          {errors.email && <ErrorText>{errors.email}</ErrorText>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="message">Message *</Label>
          <Input
            type="text"
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            $hasError={!!errors.message}
            placeholder="Enter your message (min 10 characters)"
          />
          {errors.message && <ErrorText>{errors.message}</ErrorText>}
        </FormGroup>

        <SubmitButton type="submit">
          Submit Form
        </SubmitButton>
      </Form>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#a0a0a0' }}>
        <strong>Tip:</strong> Try entering an invalid email or use "error" in the email to see different error states.
      </div>
    </Container>
  );
};

export default FormValidationExample;
