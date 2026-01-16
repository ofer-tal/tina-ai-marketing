import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import TikTokSandboxConfig from '../components/TikTokSandboxConfig';
import GoogleAnalyticsConfig from '../components/GoogleAnalyticsConfig';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { showSuccessToast, showErrorToast } from '../components/Toast';
import { validateRequired, validateUrl, validateApiKey, validateMongoDbUri, validateRange } from '../utils/validation.js';

const SettingsContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: #a0a0a0;
  margin: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 1.5rem;
`;

const Card = styled.div`
  background: #16213e;
  border: 1px solid #2d3561;
  border-radius: 12px;
  padding: 1.5rem;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 20px rgba(233, 69, 96, 0.1);
  }
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  margin: 0 0 1rem 0;
  color: #e94560;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardIcon = styled.span`
  font-size: 1.5rem;
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
  position: relative;
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
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.875rem;
  font-family: 'Fira Code', monospace;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  ${props => props.$hasError && `
    border-color: #f8312f;
    &:focus {
      box-shadow: 0 0 0 3px rgba(248, 49, 47, 0.1);
    }
  `}

  ${props => props.$hasSuccess && !props.$hasError && `
    border-color: #00d26a;
    &:focus {
      box-shadow: 0 0 0 3px rgba(0, 210, 106, 0.1);
    }
  `}

  &::placeholder {
    color: #6b7280;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #e94560;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
  }

  option {
    background: #16213e;
  }
`;

const HelpText = styled.p`
  font-size: 0.75rem;
  color: #a0a0a0;
  margin: 0;
`;

const ErrorText = styled.span`
  font-size: 0.75rem;
  color: #f8312f;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &::before {
    content: '⚠️';
    font-size: 0.625rem;
  }
`;

const SuccessIndicator = styled.span`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #00d26a;
  font-size: 1rem;
  pointer-events: none;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #e94560 0%, #7b2cbf 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  align-self: flex-start;
  margin-top: 1rem;

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

const StatusMessage = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;

  ${props => {
    if (props.$variant === 'success') {
      return `
        background: rgba(0, 210, 106, 0.1);
        border: 1px solid #00d26a;
        color: #00d26a;
      `;
    } else if (props.$variant === 'error') {
      return `
        background: rgba(248, 49, 47, 0.1);
        border: 1px solid #f8312f;
        color: #f8312f;
      `;
    } else {
      return `
        background: rgba(255, 176, 32, 0.1);
        border: 1px solid #ffb020;
        color: #ffb020;
      `;
    }
  }}
`;

const LegacyLoadingSpinner = styled.div`
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #e94560;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 0.5rem;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const categoryIcons = {
  server: '⚙️',
  database: '🗄️',
  appstore: '🍎',
  searchads: '📊',
  tiktok: '🎵',
  analytics: '📈',
  ai: '🤖',
  budget: '💰',
  content: '📝',
  platform: '📱',
  storage: '💾',
  features: '✨',
  logging: '📋'
};

const categoryTitles = {
  server: 'Server Configuration',
  database: 'Database',
  appstore: 'App Store Connect',
  searchads: 'Apple Search Ads',
  tiktok: 'TikTok Integration',
  analytics: 'Google Analytics',
  ai: 'AI Services',
  budget: 'Budget & Limits',
  content: 'Content Generation',
  platform: 'Platform Settings',
  storage: 'Storage',
  features: 'Feature Flags',
  logging: 'Logging'
};

function Settings() {
  const [schema, setSchema] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldSuccess, setFieldSuccess] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  useEffect(() => {
    fetchSchema();
    fetchSettings();
  }, []);

  const fetchSchema = async () => {
    try {
      const response = await fetch('/api/settings/schema');
      const data = await response.json();
      if (data.success) {
        setSchema(data.schema);
      }
    } catch (error) {
      console.error('Failed to fetch schema:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const validateField = (key, value, config) => {
    // Clear previous success state
    setFieldSuccess(prev => {
      const newSuccess = { ...prev };
      delete newSuccess[key];
      return newSuccess;
    });

    // Determine validation rules based on field name and config
    let validators = [];

    // Required fields
    if (config.required) {
      validators.push(validateRequired);
    }

    // URL validation
    if (key.includes('URI') || key.includes('URL') || key.includes('REDIRECT_URI')) {
      validators.push(validateUrl);
    }

    // API key validation
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
      validators.push(validateApiKey);
    }

    // MongoDB URI validation
    if (key.includes('MONGODB_URI')) {
      validators.push(validateMongoDbUri);
    }

    // Range validation for numeric values
    if (key.includes('THRESHOLD') || key.includes('BUDGET') || key.includes('LIMIT') || key.includes('SIZE')) {
      validators.push((val) => validateRange(val, 0, 999999));
    }

    // Run validators
    if (validators.length > 0) {
      for (const validator of validators) {
        const result = validator(value);
        if (!result.isValid) {
          setFieldErrors(prev => ({ ...prev, [key]: result.error }));
          setFieldSuccess(prev => {
            const newSuccess = { ...prev };
            delete newSuccess[key];
            return newSuccess;
          });
          return false;
        }
      }
    }

    // If we get here, validation passed
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    // Mark as successful if value is not empty
    if (value && value.trim() !== '') {
      setFieldSuccess(prev => ({ ...prev, [key]: true }));
    }

    return true;
  };

  const handleFieldChange = (key, value, config) => {
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [key]: true }));

    // Real-time validation after a short delay (debounced)
    if (touchedFields[key]) {
      validateField(key, value, config);
    }
  };

  const handleSubmit = async (category, event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    const updates = {};
    const formErrors = {};

    // First, validate all fields
    for (const [key, value] of formData.entries()) {
      updates[key] = value;

      // Find config for this field
      let config = null;
      if (schema && schema[category]) {
        config = schema[category][key];
      }

      // Validate the field
      let validators = [];

      if (config?.required) {
        validators.push(validateRequired);
      }

      if (key.includes('URI') || key.includes('URL') || key.includes('REDIRECT_URI')) {
        validators.push(validateUrl);
      }

      if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
        validators.push(validateApiKey);
      }

      if (key.includes('MONGODB_URI')) {
        validators.push(validateMongoDbUri);
      }

      if (key.includes('THRESHOLD') || key.includes('BUDGET') || key.includes('LIMIT') || key.includes('SIZE')) {
        validators.push((val) => validateRange(val, 0, 999999));
      }

      // Run validators
      for (const validator of validators) {
        const result = validator(value);
        if (!result.isValid) {
          formErrors[key] = result.error;
          break;
        }
      }
    }

    // If there are errors, show them and prevent submission
    if (Object.keys(formErrors).length > 0) {
      setFieldErrors(formErrors);
      setMessage({
        type: 'error',
        text: `${Object.keys(formErrors).length} field(s) need correction before saving.`
      });
      showErrorToast('Please fix validation errors before saving.', {
        title: 'Validation Error',
        duration: 4000
      });
      return;
    }

    setSaving(prev => ({ ...prev, [category]: true }));
    setMessage(null);

    try {
      // Update each setting
      const results = await Promise.all(
        Object.entries(updates).map(([key, value]) =>
          fetch(`/api/settings/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
          }).then(res => res.json())
        )
      );

      const allSuccessful = results.every(r => r.success);

      if (allSuccessful) {
        showSuccessToast('Settings saved successfully!', {
          title: 'Success',
          duration: 4000
        });
        setMessage({ type: 'success', text: `Settings updated successfully! Server restart may be required for some changes to take effect.` });

        // Mark all fields as successful
        Object.keys(updates).forEach(key => {
          if (updates[key] && updates[key].trim() !== '') {
            setFieldSuccess(prev => ({ ...prev, [key]: true }));
          }
        });

        // Refresh settings
        await fetchSettings();
      } else {
        showErrorToast('Some settings failed to update. Please try again.', {
          title: 'Partial Failure',
          duration: 6000
        });
        setMessage({ type: 'error', text: 'Some settings failed to update' });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      showErrorToast('Failed to update settings. Please check your connection.', {
        title: 'Error',
        duration: 6000
      });
      setMessage({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(prev => ({ ...prev, [category]: false }));
    }
  };

  const renderInput = (key, config, category) => {
    const value = settings[key] || config.default || '';
    const isPassword = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('PRIVATE_KEY') || key.includes('TOKEN');
    const hasError = !!fieldErrors[key];
    const hasSuccess = !!fieldSuccess[key];

    if (config.validate && config.validate.toString().includes('development') || config.validate && config.validate.toString().includes('production')) {
      // Enum select
      const options = ['development', 'production', 'test'];
      return (
        <Select name={key} defaultValue={value}>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>
      );
    }

    if (config.validate && config.validate.toString().includes('boolean')) {
      return (
        <Select name={key} defaultValue={value !== undefined ? value.toString() : 'true'}>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </Select>
      );
    }

    return (
      <>
        <Input
          type={isPassword ? 'password' : 'text'}
          name={key}
          defaultValue={value}
          placeholder={isPassword ? '••••••••' : config.default || ''}
          $hasError={hasError}
          $hasSuccess={hasSuccess}
          onChange={(e) => handleFieldChange(key, e.target.value, config)}
          onBlur={(e) => {
            setTouchedFields(prev => ({ ...prev, [key]: true }));
            validateField(key, e.target.value, config);
          }}
        />
        {hasSuccess && !isPassword && <SuccessIndicator>✓</SuccessIndicator>}
        {hasError && <ErrorText>{fieldErrors[key]}</ErrorText>}
      </>
    );
  };

  if (loading && !schema) {
    return (
      <SettingsContainer>
        <Title>Settings</Title>
        <LoadingSpinner
          variant="circular"
          size="large"
          text="Loading settings..."
          color="#e94560"
        />
      </SettingsContainer>
    );
  }

  return (
    <SettingsContainer>
      <Header>
        <Title>Settings</Title>
        <Subtitle>Configure your Blush Marketing Operations Center</Subtitle>
      </Header>

      {message && message.type === 'error' && (
        <ErrorAlert
          type="error"
          title="Settings Error"
          message={message.text}
          helpText="Please check your input and try again. If the problem persists, contact support."
          onDismiss={() => setMessage(null)}
          actions={[
            {
              label: 'Retry',
              onClick: () => {
                setMessage(null);
                fetchSettings();
              },
              variant: 'primary'
            }
          ]}
        />
      )}

      {message && message.type === 'success' && (
        <StatusMessage $variant={message.type}>
          {message.text}
        </StatusMessage>
      )}

      {/* TikTok Sandbox Configuration */}
      <TikTokSandboxConfig />

      {/* Google Analytics Configuration */}
      <GoogleAnalyticsConfig />

      <Grid>
        {schema && Object.entries(schema).map(([category, keys]) => (
          <Card key={category}>
            <CardTitle>
              <CardIcon>{categoryIcons[category] || '⚙️'}</CardIcon>
              {categoryTitles[category] || category}
            </CardTitle>
            <Form onSubmit={(e) => handleSubmit(category, e)}>
              {Object.entries(keys).map(([key, config]) => (
                <FormGroup key={key}>
                  <Label htmlFor={key}>
                    {key.replace(/_/g, ' ')}
                    {config.required && ' *'}
                  </Label>
                  {renderInput(key, config, category)}
                  {config.description && (
                    <HelpText>{config.description}</HelpText>
                  )}
                </FormGroup>
              ))}
              <Button type="submit" disabled={saving[category]}>
                {saving[category] && <LoadingSpinner inline size="small" color="#ffffff" />}
                {saving[category] ? 'Saving...' : 'Save Changes'}
              </Button>
            </Form>
          </Card>
        ))}
      </Grid>
    </SettingsContainer>
  );
}

export default Settings;
