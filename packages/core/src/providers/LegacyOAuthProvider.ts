/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseProvider } from './BaseProvider.js';
import {
  AuthProvider,
  ProviderConfig,
  ProviderValidationResult,
  ProviderCredentials,
  IProviderService,
} from './types.js';

/**
 * Legacy OAuth Provider - handles Qwen OAuth for backward compatibility
 * Consolidates QWEN_OAUTH
 */
export class LegacyOAuthProvider extends BaseProvider {
  constructor(config: ProviderConfig, providerService: IProviderService) {
    super(config.name, AuthProvider.LEGACY_OAUTH, config.displayName, config, providerService);
  }

  protected async validateProviderSpecific(): Promise<ProviderValidationResult> {
    const results: ProviderValidationResult[] = [];

    // Add deprecation warning
    results.push({
      isValid: true,
      warnings: [
        'Legacy OAuth provider is deprecated and will be removed in a future version. Please migrate to a supported provider.',
      ],
    });

    // Validate OAuth endpoint if configured
    const oauthEndpoint = this.getConfigValue<string>('oauthEndpoint');
    if (oauthEndpoint) {
      results.push(this.validateUrl(oauthEndpoint, 'OAuth Endpoint'));
    }

    // Validate token endpoint if configured
    const tokenEndpoint = this.getConfigValue<string>('tokenEndpoint');
    if (tokenEndpoint) {
      results.push(this.validateUrl(tokenEndpoint, 'Token Endpoint'));
    }

    return this.combineValidationResults(...results);
  }

  protected async validateCredentials(credentials: ProviderCredentials): ProviderValidationResult {
    const results: ProviderValidationResult[] = [];

    // Check for OAuth tokens
    if (!credentials.token && !credentials.refreshToken) {
      results.push({
        isValid: false,
        error: 'Legacy OAuth requires either access token or refresh token',
      });
    }

    // Validate token format if present
    if (credentials.token) {
      const tokenValidation = this.validateTokenFormat(credentials.token);
      results.push(tokenValidation);
    }

    return this.combineValidationResults(...results);
  }

  private validateTokenFormat(token: string): ProviderValidationResult {
    // Basic token format validation
    if (token.length < 32) {
      return {
        isValid: false,
        error: 'OAuth token appears to be too short',
      };
    }

    // Check for common token patterns
    if (token.includes(' ') || token.includes('\n')) {
      return {
        isValid: false,
        error: 'OAuth token contains invalid characters',
      };
    }

    return { isValid: true };
  }

  protected async initializeProviderSpecific(): Promise<void> {
    // Log deprecation warning during initialization
    console.warn(
      `⚠️  Legacy OAuth provider "${this.name}" is deprecated. ` +
      'Please migrate to a supported provider for continued support.'
    );

    // Check if we have valid credentials
    const credentials = await this.getCredentials();
    
    if (!credentials || (!credentials.token && !credentials.refreshToken)) {
      console.info(`OAuth credentials not found for ${this.name}. Authentication flow may be required.`);
    } else if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
      // Token is expired
      console.warn(`OAuth token for ${this.name} has expired. Re-authentication may be required.`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Basic connection test - just verify credentials exist
      const credentials = await this.getCredentials();
      return !!(credentials && (credentials.token || credentials.refreshToken));
    } catch (error) {
      console.warn(`Connection test failed for legacy provider ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Get OAuth configuration for legacy provider
   */
  getOAuthConfig(): Record<string, string> {
    return {
      clientId: this.getConfigValue<string>('clientId', ''),
      clientSecret: this.getConfigValue<string>('clientSecret', ''),
      oauthEndpoint: this.getConfigValue<string>('oauthEndpoint', ''),
      tokenEndpoint: this.getConfigValue<string>('tokenEndpoint', ''),
      scope: this.getConfigValue<string>('scope', ''),
    };
  }

  /**
   * Get migration recommendations for this legacy provider
   */
  getMigrationRecommendations(): string[] {
    const recommendations: string[] = [
      'Legacy OAuth is deprecated and will be removed in a future version.',
      'Consider migrating to one of the supported providers:',
      '• OpenAI API (for OpenAI models)',
      '• Anthropic API (for Claude models)', 
      '• Google OAuth (for Gemini/Vertex AI)',
      '• Local providers (Ollama, LM Studio) for local inference',
    ];

    // Add specific recommendations based on configuration
    const model = this.config.model;
    if (model) {
      if (model.includes('qwen')) {
        recommendations.push('• For Qwen models, consider using Ollama with local Qwen models');
      }
    }

    return recommendations;
  }

  /**
   * Get default configuration for legacy OAuth
   */
  static getDefaultConfig(): Partial<ProviderConfig> {
    return {
      type: AuthProvider.LEGACY_OAUTH,
      name: 'qwen-oauth',
      displayName: 'Qwen OAuth (Legacy)',
      enabled: false, // Disabled by default
      additionalConfig: {
        deprecated: true,
        migrationRequired: true,
      },
    };
  }

  /**
   * Check if this provider should be automatically disabled
   */
  shouldDisable(): boolean {
    // Disable if explicitly marked as deprecated
    return this.getConfigValue<boolean>('deprecated', false);
  }

  /**
   * Get environment variables used by legacy OAuth
   */
  getEnvironmentVariables(): Record<string, string> {
    return {
      clientId: 'QWEN_OAUTH_CLIENT_ID',
      clientSecret: 'QWEN_OAUTH_CLIENT_SECRET',
      token: 'QWEN_OAUTH_TOKEN',
      refreshToken: 'QWEN_OAUTH_REFRESH_TOKEN',
    };
  }
}