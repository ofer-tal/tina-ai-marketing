import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import TikTokSandboxConfig from '../components/TikTokSandboxConfig';
import InstagramConfig from '../components/InstagramConfig';
import GoogleAnalyticsConfig from '../components/GoogleAnalyticsConfig';
import GoogleSheetsConfig from '../components/GoogleSheetsConfig';
import YouTubeConfig from '../components/YouTubeConfig';
import TieredVideoConfig from '../components/TieredVideoConfig';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import ConfirmationModal from '../components/ConfirmationModal';
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

const ImportExportSection = styled.div`
  margin-bottom: 2rem;
`;

const ImportExportCard = styled(Card)`
  max-width: 800px;
  margin: 0 auto;
`;

const ImportExportDescription = styled.p`
  color: #a0a0a0;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #1a1a2e;
  border: 1px solid #2d3561;
  border-radius: 8px;
  color: #eaeaea;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: #16213e;
    border-color: #e94560;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const DebugPanel = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-height: 300px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #c9d1d9;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
`;

const DebugHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: #21262d;
  }
`;

const DebugTitle = styled.span`
  font-weight: 600;
  color: #e94560;
`;

const DebugClear = styled.button`
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;

  &:hover {
    background: #30363d;
    color: #c9d1d9;
  }
`;

const DebugContent = styled.div`
  padding: 10px;
  overflow-y: auto;
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #0d1117;
  }

  &::-webkit-scrollbar-thumb {
    background: #30363d;
    border-radius: 3px;
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
  logging: '📋',
  notifications: '🔔',
  retention: '🗂️'
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
  logging: 'Logging',
  notifications: 'Notifications',
  retention: 'Data Retention',
  importexport: 'Import / Export'
};

function Settings() {
  const [schema, setSchema] = useState(null);
  const [settings, setSettings] = useState({});
  const [formValues, setFormValues] = useState({}); // Local form state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldSuccess, setFieldSuccess] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [debugLog, setDebugLog] = useState([]); // Debug log that persists
  const [debugCollapsed, setDebugCollapsed] = useState(false); // Debug panel collapsed state
  const fileInputRef = React.createRef();

  // Budget confirmation state
  const [budgetConfirmModal, setBudgetConfirmModal] = useState({
    isOpen: false,
    key: null,
    currentValue: 0,
    newValue: 0,
    changeAmount: 0,
    pendingUpdates: {}
  });

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
        // Also update form values to match
        setFormValues(data.settings);
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

  const handleSubmit = async (category, event, confirmed = false) => {
    event.preventDefault();

    // Use formValues state directly instead of FormData - this is more reliable
    const updates = {};
    const formErrors = {};

    // Get all keys for this category from the schema
    const categoryKeys = schema && schema[category] ? Object.keys(schema[category]) : [];

    // Log to on-screen debug panel
    const newLogs = [
      `=== Saving ${category} ===`,
      `Time: ${new Date().toLocaleTimeString()}`,
      `Category keys: ${categoryKeys.length}`,
      ''
    ];

    // Collect values from formValues state for this category
    for (const key of categoryKeys) {
      const value = formValues[key];
      updates[key] = value;
      const valueStr = String(value ?? '');
      newLogs.push(`  ${key}: "${valueStr}" (type: ${typeof value})`);
    }

    newLogs.push('');
    setDebugLog(prev => [...newLogs, ...prev].slice(0, 50)); // Keep last 50 lines

    // Validate all fields in this category
    for (const key of categoryKeys) {
      const value = updates[key];
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
        // Only validate URL if value is not empty
        if (value && value.trim()) {
          validators.push(validateUrl);
        }
      }

      if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
        // Only validate API keys/secrets if value is not empty
        if (value && value.trim()) {
          validators.push(validateApiKey);
        }
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
      // Check if any budget settings are being changed by more than $100
      const budgetChanges = [];
      for (const [key, value] of Object.entries(updates)) {
        if (key.includes('BUDGET') && key.includes('LIMIT')) {
          const numericValue = parseFloat(value);
          const currentValue = parseFloat(settings[key] || '0');
          const changeAmount = Math.abs(numericValue - currentValue);

          if (changeAmount > 100 && !confirmed) {
            budgetChanges.push({
              key,
              currentValue,
              newValue: numericValue,
              changeAmount
            });
          }
        }
      }

      // If there are budget changes over $100 and not yet confirmed, show modal
      if (budgetChanges.length > 0 && !confirmed) {
        const change = budgetChanges[0]; // Handle first large change
        setBudgetConfirmModal({
          isOpen: true,
          key: change.key,
          currentValue: change.currentValue,
          newValue: change.newValue,
          changeAmount: change.changeAmount,
          pendingUpdates: updates
        });
        setSaving(prev => ({ ...prev, [category]: false }));
        return;
      }

      // Update each setting SEQUENTIALLY to avoid race conditions with .env file
      // Log API requests to debug panel
      setDebugLog(prev => ['--- Sending API requests ---', ...prev]);

      const results = [];
      for (const [key, value] of Object.entries(updates)) {
        const valueStr = String(value ?? '');
        setDebugLog(prev => [`  PUT ${key}: "${valueStr}"`, ...prev]);

        try {
          const response = await fetch(`/api/settings/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value, confirmed })
          });
          const result = await response.json();
          results.push(result);

          if (result.success) {
            setDebugLog(prev => [`    ✓ ${key} saved`, ...prev]);
          } else {
            setDebugLog(prev => [`    ✗ ${key} FAILED: ${result.error}`, ...prev]);
          }
        } catch (error) {
          results.push({ success: false, error: error.message, key });
          setDebugLog(prev => [`    ✗ ${key} ERROR: ${error.message}`, ...prev]);
        }
      }

      setDebugLog(prev => ['--- API requests completed ---', '', ...prev]);

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
        // Check if any result requires confirmation
        const requiresConfirmation = results.find(r => r.requiresConfirmation);
        if (requiresConfirmation) {
          setBudgetConfirmModal({
            isOpen: true,
            key: requiresConfirmation.details.key,
            currentValue: requiresConfirmation.details.currentValue,
            newValue: requiresConfirmation.details.newValue,
            changeAmount: requiresConfirmation.details.changeAmount,
            pendingUpdates: updates
          });
        } else {
          showErrorToast('Some settings failed to update. Please try again.', {
            title: 'Partial Failure',
            duration: 6000
          });
          setMessage({ type: 'error', text: 'Some settings failed to update' });
        }
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

  const handleConfirmBudgetChange = async () => {
    const { pendingUpdates, key } = budgetConfirmModal;

    // Determine which category this belongs to
    let category = 'budget';
    for (const [cat, keys] of Object.entries(schema)) {
      if (keys[key]) {
        category = cat;
        break;
      }
    }

    // Create a mock event with the pending updates
    const mockEvent = {
      preventDefault: () => {},
      target: {
        elements: Object.entries(pendingUpdates).reduce((acc, [k, v]) => {
          acc[k] = { value: v, name: k };
          return acc;
        }, {})
      }
    };

    // Close the modal and submit with confirmed=true
    setBudgetConfirmModal(prev => ({ ...prev, isOpen: false }));
    await handleSubmit(category, mockEvent, true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/settings/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        // Create a blob and download
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `blush-marketing-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showSuccessToast('Configuration exported successfully!', {
          title: 'Export Complete',
          duration: 4000
        });
        setMessage({ type: 'success', text: 'Configuration exported successfully!' });
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
      showErrorToast('Failed to export configuration', {
        title: 'Export Error',
        duration: 6000
      });
      setMessage({ type: 'error', text: 'Failed to export configuration' });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setImporting(true);

      // Read the file
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the structure
      if (!data.version || !data.settings) {
        throw new Error('Invalid configuration file format');
      }

      // Confirm import
      const confirmed = window.confirm(
        `This will import ${Object.keys(data.settings).length} settings from ${data.exportedAt}.\n\n` +
        `Version: ${data.version}\n` +
        `Environment: ${data.environment}\n\n` +
        `Continue? This action cannot be undone.`
      );

      if (!confirmed) {
        setImporting(false);
        event.target.value = '';
        return;
      }

      // Send to backend
      const response = await fetch('/api/settings/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast(`Configuration imported successfully! ${result.updateCount} settings updated.`, {
          title: 'Import Complete',
          duration: 5000
        });
        setMessage({ type: 'success', text: result.message });

        // Refresh settings
        await fetchSettings();
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      showErrorToast(error.message || 'Failed to import configuration', {
        title: 'Import Error',
        duration: 6000
      });
      setMessage({ type: 'error', text: error.message || 'Failed to import configuration' });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const renderInput = (key, config, category) => {
    // Use formValues for controlled components - this ensures the value is always correct
    const value = formValues[key] !== undefined ? formValues[key] : (settings[key] || config.default || '');
    const hasError = !!fieldErrors[key];
    const hasSuccess = !!fieldSuccess[key];

    const handleChange = (newValue) => {
      setFormValues(prev => ({ ...prev, [key]: newValue }));
      handleFieldChange(key, newValue, config);
    };

    if (config.validate && config.validate.toString().includes('development') || config.validate && config.validate.toString().includes('production')) {
      // Enum select
      const options = ['development', 'production', 'test'];
      return (
        <Select name={key} value={value} autoComplete="off" onChange={(e) => handleChange(e.target.value)}>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>
      );
    }

    if (config.validate && config.validate.toString().includes('boolean')) {
      const boolValue = value !== undefined ? String(value) : 'true';
      return (
        <Select name={key} value={boolValue} autoComplete="off" onChange={(e) => handleChange(e.target.value)}>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </Select>
      );
    }

    return (
      <>
        <Input
          id={key}
          type="text"
          name={key}
          value={value}
          placeholder={config.default || ''}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-form-type="settings"
          data-setting-key={key}
          $hasError={hasError}
          $hasSuccess={hasSuccess}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={(e) => {
            setTouchedFields(prev => ({ ...prev, [key]: true }));
            validateField(key, e.target.value, config);
          }}
        />
        {hasSuccess && <SuccessIndicator>✓</SuccessIndicator>}
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

      {/* Import/Export Configuration */}
      <ImportExportSection>
        <ImportExportCard>
          <CardTitle>
            <CardIcon>📦</CardIcon>
            Import / Export Configuration
          </CardTitle>
          <ImportExportDescription>
            Export your current settings to a file for backup or transfer to another environment.
            Import previously exported settings to restore your configuration.
          </ImportExportDescription>
          <ButtonGroup>
            <SecondaryButton
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting && <LegacyLoadingSpinner />}
              📥 Export Configuration
            </SecondaryButton>
            <SecondaryButton
              onClick={() => fileInputRef.current.click()}
              disabled={importing}
            >
              {importing && <LegacyLoadingSpinner />}
              📤 Import Configuration
            </SecondaryButton>
            <HiddenInput
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
            />
          </ButtonGroup>
        </ImportExportCard>
      </ImportExportSection>

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

      {/* Instagram Integration Configuration */}
      <InstagramConfig />

      {/* Google Analytics Configuration */}
      <GoogleAnalyticsConfig />

      {/* Google Sheets Configuration */}
      <GoogleSheetsConfig />

      {/* YouTube Configuration */}
      <YouTubeConfig />

      {/* Tiered Video Generation Configuration */}
      <TieredVideoConfig />

      <Grid>
        {schema && Object.entries(schema).map(([category, keys]) => (
          <Card key={category}>
            <CardTitle>
              <CardIcon>{categoryIcons[category] || '⚙️'}</CardIcon>
              {categoryTitles[category] || category}
            </CardTitle>
            <Form onSubmit={(e) => handleSubmit(category, e)} autoComplete="off">
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

      {/* Budget Confirmation Modal */}
      <ConfirmationModal
        isOpen={budgetConfirmModal.isOpen}
        onClose={() => setBudgetConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmBudgetChange}
        title="Confirm Large Budget Change"
        message={`You are about to change the budget by $${budgetConfirmModal.changeAmount.toFixed(2)}. This action requires explicit confirmation.`}
        detail={`Current: $${budgetConfirmModal.currentValue.toFixed(2)} → New: $${budgetConfirmModal.newValue.toFixed(2)}`}
        icon="💰"
        confirmText="Confirm Budget Change"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Debug Panel */}
      {debugLog.length > 0 && (
        <DebugPanel>
          <DebugHeader onClick={() => setDebugCollapsed(!debugCollapsed)}>
            <DebugTitle>🐛 Debug Log ({debugLog.length})</DebugTitle>
            <DebugClear onClick={(e) => { e.stopPropagation(); setDebugLog([]); }}>Clear</DebugClear>
          </DebugHeader>
          {!debugCollapsed && (
            <DebugContent>
              {debugLog.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </DebugContent>
          )}
        </DebugPanel>
      )}
    </SettingsContainer>
  );
}

export default Settings;
