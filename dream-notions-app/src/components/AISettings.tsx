import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load existing configuration on mount
  useEffect(() => {
    if (isOpen) {
      const config = aiService.loadConfig();
      if (config) {
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setModel(config.model);
        setCustomInstructions(config.customInstructions || '');
      } else {
        // Set defaults
        setProvider('openai');
        setApiKey('');
        setModel('gpt-4o-mini');
        setCustomInstructions('');
      }
      setTestResult(null);
    }
  }, [isOpen]);

  // Update available models when provider changes
  useEffect(() => {
    const models = aiService.getAvailableModels(provider);
    if (models.length > 0 && !models.includes(model)) {
      setModel(models[0]);
    }
  }, [provider, model]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, error: 'API key is required' });
      return;
    }

    const config = {
      provider,
      apiKey: apiKey.trim(),
      model,
      customInstructions: customInstructions.trim(),
    };

    aiService.saveConfig(config);
    setTestResult({ success: true });
    
    // Close modal after a short delay
    setTimeout(() => {
      onClose();
      setTestResult(null);
    }, 1500);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, error: 'Please enter an API key first' });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    // Temporarily save config for testing
    const tempConfig = { provider, apiKey: apiKey.trim(), model, customInstructions: customInstructions.trim() };
    aiService.saveConfig(tempConfig);

    try {
      const result = await aiService.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleClearSettings = () => {
    aiService.clearConfig();
    setProvider('openai');
    setApiKey('');
    setModel('gpt-4o-mini');
    setCustomInstructions('');
    setTestResult(null);
  };

  if (!isOpen) return null;

  const availableModels = aiService.getAvailableModels(provider);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-2xl border border-border max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl mb-6 text-foreground text-center">AI Service Configuration</h2>
        
        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
              className="w-full p-3 border border-border rounded-md bg-background text-foreground text-sm"
            >
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                className="w-full p-3 border border-border rounded-md bg-background text-foreground text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {provider === 'openai' 
                ? 'Get your API key from: https://platform.openai.com/api-keys'
                : 'Get your API key from: https://console.anthropic.com/settings/keys'
              }
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-3 border border-border rounded-md bg-background text-foreground text-sm"
            >
              {availableModels.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {provider === 'openai' 
                ? 'gpt-4o-mini is recommended for cost-effectiveness'
                : 'claude-3-5-sonnet-20241022 is recommended for best quality'
              }
            </p>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add specific instructions for how the AI should process your dreams. For example: 'Focus on maintaining my personal writing style' or 'Always preserve exact names and places mentioned' or 'Add more emotional depth to the narrative'..."
              className="w-full p-3 border border-border rounded-md bg-background text-foreground text-sm min-h-[100px] resize-y"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              These instructions will be added to the AI prompt to customize how your dreams are processed.
            </p>
          </div>

          {/* Test Connection */}
          <div>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection || !apiKey.trim()}
              className="w-full px-4 py-3 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Testing Connection...
                </span>
              ) : (
                'Test Connection'
              )}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-md text-sm ${
              testResult.success 
                ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                : 'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}>
              {testResult.success ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connection successful! AI service is ready to use.
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {testResult.error}
                </span>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>Security Notice:</strong> Your API key is stored locally in your browser only. 
                It's never sent to our servers. However, your dream text will be sent to the selected AI provider for processing.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleClearSettings}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-red-600 hover:bg-red-500/10 border border-red-500/20"
          >
            Clear Settings
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;