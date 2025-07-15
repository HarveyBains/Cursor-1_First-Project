interface AIConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  customInstructions?: string;
}

interface AIResponse {
  cleanedText: string;
  error?: string;
}

class AIService {
  private config: AIConfig | null = null;

  // Load configuration from localStorage
  loadConfig(): AIConfig | null {
    const stored = localStorage.getItem('dream-ai-config');
    if (stored) {
      try {
        this.config = JSON.parse(stored);
        return this.config;
      } catch (error) {
        console.error('Error loading AI config:', error);
        return null;
      }
    }
    return null;
  }

  // Save configuration to localStorage
  saveConfig(config: AIConfig): void {
    this.config = config;
    localStorage.setItem('dream-ai-config', JSON.stringify(config));
  }

  // Clear configuration
  clearConfig(): void {
    this.config = null;
    localStorage.removeItem('dream-ai-config');
  }

  // Check if AI is configured
  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  // Get current configuration
  getConfig(): AIConfig | null {
    return this.config;
  }

  // Test API connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'No configuration found' };
    }

    try {
      const response = await this.callAI('Test connection', true);
      return { success: !response.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Main AI text cleanup function
  async cleanupText(originalText: string, useCustomPrompt: boolean = false): Promise<AIResponse> {
    if (!this.config) {
      return { cleanedText: '', error: 'AI not configured. Please set up your AI service in settings.' };
    }

    if (!originalText.trim()) {
      return { cleanedText: '', error: 'No text provided' };
    }

    try {
      return await this.callAI(originalText, false, useCustomPrompt);
    } catch (error) {
      console.error('AI service error:', error);
      return { 
        cleanedText: '', 
        error: error instanceof Error ? error.message : 'AI service error'
      };
    }
  }

  // Build the cleanup prompt with custom instructions
  private buildCleanupPrompt(text: string): string {
    const baseInstructions = "Please clean up and improve this dream description. Fix spelling, grammar, and make it flow better as a narrative while preserving the original meaning and details. Keep it natural and in first person.";
    
    const customInstructions = this.config?.customInstructions?.trim();
    
    if (customInstructions) {
      return `${baseInstructions}

Additional instructions: ${customInstructions}

Dream text to process:
${text}`;
    } else {
      return `${baseInstructions}

Dream text to process:
${text}`;
    }
  }

  // Call AI service based on provider
  private async callAI(text: string, isTest: boolean = false, useCustomPrompt: boolean = false): Promise<AIResponse> {
    if (!this.config) {
      throw new Error('No AI configuration');
    }

    let prompt: string;
    if (isTest) {
      prompt = 'Respond with "Connection successful" if you can read this.';
    } else if (useCustomPrompt) {
      // For custom prompts (like title generation), use the text as-is
      prompt = text;
    } else {
      // For dream cleanup, use the standard prompt building
      prompt = this.buildCleanupPrompt(text);
    }

    switch (this.config.provider) {
      case 'openai':
        return await this.callOpenAI(prompt);
      case 'anthropic':
        return await this.callAnthropic(prompt);
      default:
        throw new Error('Unsupported AI provider');
    }
  }

  // OpenAI API call
  private async callOpenAI(prompt: string): Promise<AIResponse> {
    if (!this.config) throw new Error('No configuration');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      cleanedText: data.choices[0]?.message?.content || 'No response from AI'
    };
  }

  // Anthropic API call
  private async callAnthropic(prompt: string): Promise<AIResponse> {
    if (!this.config) throw new Error('No configuration');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      cleanedText: data.content[0]?.text || 'No response from AI'
    };
  }

  // Get available models for each provider
  getAvailableModels(provider: 'openai' | 'anthropic'): string[] {
    switch (provider) {
      case 'openai':
        return [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-3.5-turbo'
        ];
      case 'anthropic':
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
      default:
        return [];
    }
  }
}

// Export singleton instance
export const aiService = new AIService();