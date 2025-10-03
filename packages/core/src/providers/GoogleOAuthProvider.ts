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
 * Google OAuth Provider - handles Google services with OAuth
 * Consolidates LOGIN_WITH_GOOGLE, USE_VERTEX_AI, CLOUD_SHELL
 */
export class GoogleOAuthProvider extends BaseProvider {
  constructor(config: ProviderConfig, providerService: IProviderService) {
    super(config.name, AuthProvider.GOOGLE_OAUTH, config.displayName, config, providerService);
  }

  protected async validateProviderSpecific(): Promise<ProviderValidationResult> {
    const authMode = this.getConfigValue<string>('authMode', 'oauth');
    
    switch (authMode) {
      case 'oauth':
        return this.validateOAuthMode();
      case 'vertex-ai':
        return this.validateVertexAIMode();
      case 'cloud-shell':
        return this.validateCloudShellMode();
      default:
        return {
          isValid: false,
          error: `Unknown Google auth mode: ${authMode}`,
        };
    }
  }

  private validateOAuthMode(): ProviderValidationResult {
    // OAuth mode typically doesn't require additional configuration
    // Credentials are handled through OAuth flow
    return { isValid: true };
  }

  private validateVertexAIMode(): ProviderValidationResult {
    const results: ProviderValidationResult[] = [];

    // Check for Vertex AI configuration
    const projectId = this.getConfigValue<string>('projectId') || process.env.GOOGLE_CLOUD_PROJECT;
    const location = this.getConfigValue<string>('location') || process.env.GOOGLE_CLOUD_LOCATION;
    const googleApiKey = this.getConfigValue<string>('googleApiKey');

    // Vertex AI requires either project/location OR Google API key
    const hasVertexConfig = projectId && location;
    const hasApiKey = googleApiKey;

    if (!hasVertexConfig && !hasApiKey) {
      return {
        isValid: false,
        error: 'Vertex AI requires either (GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION) or GOOGLE_API_KEY',
      };
    }

    if (hasVertexConfig) {
      results.push(this.validateRequired(projectId, 'Google Cloud Project ID'));
      results.push(this.validateRequired(location, 'Google Cloud Location'));
    }

    return this.combineValidationResults(...results);
  }

  private validateCloudShellMode(): ProviderValidationResult {
    // Cloud Shell mode uses ambient credentials
    // No additional validation required
    return { isValid: true };
  }

  protected async validateCredentials(credentials: ProviderCredentials): Promise<ProviderValidationResult> {
    const authMode = this.getConfigValue<string>('authMode', 'oauth');

    switch (authMode) {
      case 'oauth':
        return this.validateOAuthCredentials(credentials);
      case 'vertex-ai':
        return this.validateVertexAICredentials(credentials);
      case 'cloud-shell':
        return this.validateCloudShellCredentials(credentials);
      default:
        return { isValid: true };
    }
  }

  private validateOAuthCredentials(credentials: ProviderCredentials): ProviderValidationResult {
    // OAuth should have token and refresh token
    if (credentials.token || credentials.refreshToken) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: 'OAuth credentials require either access token or refresh token',
    };
  }

  private validateVertexAICredentials(credentials: ProviderCredentials): ProviderValidationResult {
    // Vertex AI can use OAuth tokens or API key
    const hasOAuth = credentials.token || credentials.refreshToken;
    const hasApiKey = credentials.apiKey;

    if (!hasOAuth && !hasApiKey) {
      return {
        isValid: false,
        error: 'Vertex AI requires either OAuth tokens or Google API key',
      };
    }

    return { isValid: true };
  }

  private validateCloudShellCredentials(credentials: ProviderCredentials): ProviderValidationResult {
    // Cloud Shell uses ambient credentials, so any credentials are optional
    return { isValid: true };
  }

  /**
   * Initialize OAuth flow if needed
   */
  protected async initializeProviderSpecific(): Promise<void> {
    const authMode = this.getConfigValue<string>('authMode', 'oauth');
    
    if (authMode === 'oauth') {
      await this.initializeOAuthFlow();
    }
  }

  private async initializeOAuthFlow(): Promise<void> {
    // Check if we have valid credentials
    const credentials = await this.getCredentials();
    
    if (!credentials || (!credentials.token && !credentials.refreshToken)) {
      // OAuth flow will be initiated when needed
      console.info(`OAuth credentials not found for ${this.name}. OAuth flow will be initiated when required.`);
    } else if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
      // Token is expired, try to refresh
      await this.refreshOAuthToken(credentials);
    }
  }

  private async refreshOAuthToken(credentials: ProviderCredentials): Promise<void> {
    if (!credentials.refreshToken) {
      throw new Error('Cannot refresh OAuth token: no refresh token available');
    }

    // Token refresh logic would go here
    // This would typically involve calling Google's token refresh endpoint
    console.info(`OAuth token refresh needed for ${this.name}`);
  }

  /**
   * Get the OAuth scope required for this provider
   */
  getOAuthScope(): string[] {
    const authMode = this.getConfigValue<string>('authMode', 'oauth');
    
    switch (authMode) {
      case 'vertex-ai':
        return ['https://www.googleapis.com/auth/cloud-platform'];
      case 'oauth':
      default:
        return [
          'https://www.googleapis.com/auth/generative-language',
          'https://www.googleapis.com/auth/cloud-platform',
        ];
    }
  }

  /**
   * Get the appropriate environment variable names for this mode
   */
  getEnvironmentVariables(): Record<string, string> {
    const authMode = this.getConfigValue<string>('authMode', 'oauth');
    
    switch (authMode) {
      case 'vertex-ai':
        return {
          projectId: 'GOOGLE_CLOUD_PROJECT',
          location: 'GOOGLE_CLOUD_LOCATION',
          apiKey: 'GOOGLE_API_KEY',
        };
      default:
        return {
          apiKey: 'GOOGLE_API_KEY',
        };
    }
  }

  /**
   * Get default configuration for Google OAuth providers
   */
  static getDefaultConfig(authMode: string): Partial<ProviderConfig> {
    const baseConfig: Partial<ProviderConfig> = {
      type: AuthProvider.GOOGLE_OAUTH,
      additionalConfig: { authMode },
    };

    switch (authMode) {
      case 'vertex-ai':
        return {
          ...baseConfig,
          name: 'vertex-ai',
          displayName: 'Google Vertex AI',
          model: 'gemini-pro',
        };
      case 'cloud-shell':
        return {
          ...baseConfig,
          name: 'cloud-shell',
          displayName: 'Google Cloud Shell',
          model: 'gemini-pro',
        };
      case 'oauth':
      default:
        return {
          ...baseConfig,
          name: 'google-oauth',
          displayName: 'Google OAuth',
          model: 'gemini-pro',
        };
    }
  }
}