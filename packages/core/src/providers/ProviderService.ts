/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IProviderService,
  ProviderConfig,
  ProviderValidationResult,
  ProviderCredentials,
} from './types.js';
import { credentialManager } from '../utils/credentialManager.js';

/**
 * Provider service implementation
 * Handles credential management and provider validation
 */
export class ProviderService implements IProviderService {
  constructor() {}

  async validateConfiguration(config: ProviderConfig): Promise<ProviderValidationResult> {
    try {
      // Basic configuration validation
      const basicValidation = this.validateBasicConfig(config);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Type-specific validation
      const typeValidation = await this.validateTypeSpecific(config);
      return typeValidation;
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  private validateBasicConfig(config: ProviderConfig): ProviderValidationResult {
    if (!config.name) {
      return { isValid: false, error: 'Provider name is required' };
    }

    if (!config.type) {
      return { isValid: false, error: 'Provider type is required' };
    }

    if (!config.displayName) {
      return { isValid: false, error: 'Provider display name is required' };
    }

    return { isValid: true };
  }

  private async validateTypeSpecific(config: ProviderConfig): Promise<ProviderValidationResult> {
    switch (config.type) {
      case 'api-key':
        return this.validateApiKeyConfig(config);
      case 'local-http':
        return this.validateLocalHttpConfig(config);
      case 'google-oauth':
        return this.validateGoogleOAuthConfig(config);
      case 'legacy-oauth':
        return this.validateLegacyOAuthConfig(config);
      default:
        return { isValid: false, error: `Unknown provider type: ${config.type}` };
    }
  }

  private validateApiKeyConfig(config: ProviderConfig): ProviderValidationResult {
    if (!config.model) {
      return { isValid: false, error: 'API key providers must specify a model' };
    }

    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        return { isValid: false, error: 'Invalid base URL format' };
      }
    }

    return { isValid: true };
  }

  private validateLocalHttpConfig(config: ProviderConfig): ProviderValidationResult {
    if (!config.baseUrl) {
      return { isValid: false, error: 'Local HTTP providers must specify a base URL' };
    }

    try {
      const url = new URL(config.baseUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { isValid: false, error: 'Base URL must use HTTP or HTTPS protocol' };
      }
    } catch {
      return { isValid: false, error: 'Invalid base URL format' };
    }

    return { isValid: true };
  }

  private validateGoogleOAuthConfig(config: ProviderConfig): ProviderValidationResult {
    const authMode = config.additionalConfig?.authMode;
    if (authMode && !['oauth', 'vertex-ai', 'cloud-shell'].includes(authMode as string)) {
      return { isValid: false, error: `Invalid auth mode: ${authMode}` };
    }

    return { isValid: true };
  }

  private validateLegacyOAuthConfig(config: ProviderConfig): ProviderValidationResult {
    return {
      isValid: true,
      warnings: ['Legacy OAuth is deprecated and will be removed in a future version'],
    };
  }

  async getCredentials(providerName: string): Promise<ProviderCredentials | null> {
    try {
      // Get credentials from secure storage
      const credentials: ProviderCredentials = {};

      // Try to get API key
      const apiKey = await credentialManager.getCredential(`${providerName.toUpperCase()}_API_KEY`);
      if (apiKey) {
        credentials.apiKey = apiKey;
      }

      // Try to get base URL (for some providers)
      const baseUrl = await credentialManager.getCredential(`${providerName.toUpperCase()}_BASE_URL`);
      if (baseUrl) {
        credentials.baseUrl = baseUrl;
      }

      // Try to get OAuth tokens
      const token = await credentialManager.getCredential(`${providerName.toUpperCase()}_TOKEN`);
      if (token) {
        credentials.token = token;
      }

      const refreshToken = await credentialManager.getCredential(`${providerName.toUpperCase()}_REFRESH_TOKEN`);
      if (refreshToken) {
        credentials.refreshToken = refreshToken;
      }

      // Try to get expiration time
      const expiresAt = await credentialManager.getCredential(`${providerName.toUpperCase()}_EXPIRES_AT`);
      if (expiresAt) {
        const timestamp = parseInt(expiresAt, 10);
        if (!isNaN(timestamp)) {
          credentials.expiresAt = timestamp;
        }
      }

      // Get additional credentials
      const additionalCredentials = await this.getAdditionalCredentials(providerName);
      if (Object.keys(additionalCredentials).length > 0) {
        credentials.additionalCredentials = additionalCredentials;
      }

      // Return null if no credentials found
      if (Object.keys(credentials).length === 0) {
        return null;
      }

      return credentials;
    } catch (error) {
      console.warn(`Failed to get credentials for provider ${providerName}:`, error);
      return null;
    }
  }

  private async getAdditionalCredentials(providerName: string): Promise<Record<string, string>> {
    const additionalCredentials: Record<string, string> = {};

    // Provider-specific additional credentials
    switch (providerName) {
      case 'google-oauth':
      case 'vertex-ai':
        const projectId = await credentialManager.getCredential('GOOGLE_CLOUD_PROJECT');
        if (projectId) additionalCredentials.projectId = projectId;
        
        const location = await credentialManager.getCredential('GOOGLE_CLOUD_LOCATION');
        if (location) additionalCredentials.location = location;
        
        const googleApiKey = await credentialManager.getCredential('GOOGLE_API_KEY');
        if (googleApiKey) additionalCredentials.googleApiKey = googleApiKey;
        break;

      case 'runpod':
        const runpodModel = await credentialManager.getCredential('RUNPOD_MODEL');
        if (runpodModel) additionalCredentials.model = runpodModel;
        break;

      case 'qwen-oauth':
        const clientId = await credentialManager.getCredential('QWEN_OAUTH_CLIENT_ID');
        if (clientId) additionalCredentials.clientId = clientId;
        
        const clientSecret = await credentialManager.getCredential('QWEN_OAUTH_CLIENT_SECRET');
        if (clientSecret) additionalCredentials.clientSecret = clientSecret;
        break;
    }

    return additionalCredentials;
  }

  async setCredentials(providerName: string, credentials: ProviderCredentials): Promise<void> {
    try {
      // Set API key
      if (credentials.apiKey) {
        await credentialManager.setCredential(`${providerName.toUpperCase()}_API_KEY`, credentials.apiKey);
      }

      // Set base URL (stored in secure storage for some providers)
      if (credentials.baseUrl) {
        await credentialManager.setCredential(`${providerName.toUpperCase()}_BASE_URL`, credentials.baseUrl);
      }

      // Set OAuth tokens
      if (credentials.token) {
        await credentialManager.setCredential(`${providerName.toUpperCase()}_TOKEN`, credentials.token);
      }

      if (credentials.refreshToken) {
        await credentialManager.setCredential(`${providerName.toUpperCase()}_REFRESH_TOKEN`, credentials.refreshToken);
      }

      // Set expiration time
      if (credentials.expiresAt) {
        await credentialManager.setCredential(`${providerName.toUpperCase()}_EXPIRES_AT`, credentials.expiresAt.toString());
      }

      // Set additional credentials
      if (credentials.additionalCredentials) {
        await this.setAdditionalCredentials(providerName, credentials.additionalCredentials);
      }
    } catch (error) {
      throw new Error(`Failed to set credentials for provider ${providerName}: ${error}`);
    }
  }

  private async setAdditionalCredentials(providerName: string, additionalCredentials: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(additionalCredentials)) {
      const credentialKey = this.getAdditionalCredentialKey(providerName, key);
      await credentialManager.setCredential(credentialKey, value);
    }
  }

  private getAdditionalCredentialKey(providerName: string, key: string): string {
    // Map common keys to standard environment variable names
    const keyMappings: Record<string, Record<string, string>> = {
      'google-oauth': {
        projectId: 'GOOGLE_CLOUD_PROJECT',
        location: 'GOOGLE_CLOUD_LOCATION',
        googleApiKey: 'GOOGLE_API_KEY',
      },
      'vertex-ai': {
        projectId: 'GOOGLE_CLOUD_PROJECT',
        location: 'GOOGLE_CLOUD_LOCATION',
        googleApiKey: 'GOOGLE_API_KEY',
      },
      'qwen-oauth': {
        clientId: 'QWEN_OAUTH_CLIENT_ID',
        clientSecret: 'QWEN_OAUTH_CLIENT_SECRET',
      },
    };

    const providerMappings = keyMappings[providerName];
    if (providerMappings && providerMappings[key]) {
      return providerMappings[key];
    }

    // Default mapping
    return `${providerName.toUpperCase()}_${key.toUpperCase()}`;
  }

  async deleteCredentials(providerName: string): Promise<void> {
    try {
      // Delete common credentials
      const commonKeys = [
        `${providerName.toUpperCase()}_API_KEY`,
        `${providerName.toUpperCase()}_BASE_URL`,
        `${providerName.toUpperCase()}_TOKEN`,
        `${providerName.toUpperCase()}_REFRESH_TOKEN`,
        `${providerName.toUpperCase()}_EXPIRES_AT`,
      ];

      for (const key of commonKeys) {
        try {
          await credentialManager.deleteCredential(key);
        } catch {
          // Ignore errors for non-existent credentials
        }
      }

      // Delete provider-specific credentials
      await this.deleteProviderSpecificCredentials(providerName);
    } catch (error) {
      console.warn(`Failed to delete some credentials for provider ${providerName}:`, error);
    }
  }

  private async deleteProviderSpecificCredentials(providerName: string): Promise<void> {
    const providerSpecificKeys: Record<string, string[]> = {
      'google-oauth': ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION', 'GOOGLE_API_KEY'],
      'vertex-ai': ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION', 'GOOGLE_API_KEY'],
      'qwen-oauth': ['QWEN_OAUTH_CLIENT_ID', 'QWEN_OAUTH_CLIENT_SECRET'],
    };

    const keys = providerSpecificKeys[providerName] || [];
    for (const key of keys) {
      try {
        await credentialManager.deleteCredential(key);
      } catch {
        // Ignore errors for non-existent credentials
      }
    }
  }

  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      // Basic connection test based on provider type
      switch (config.type) {
        case 'local-http':
          return await this.testLocalHttpConnection(config);
        case 'api-key':
          return await this.testApiKeyConnection(config);
        case 'google-oauth':
        case 'legacy-oauth':
          // OAuth connections require more complex testing
          return true; // Assume valid for now
        default:
          return false;
      }
    } catch (error) {
      console.warn(`Connection test failed for ${config.name}:`, error);
      return false;
    }
  }

  private async testLocalHttpConnection(config: ProviderConfig): Promise<boolean> {
    if (!config.baseUrl) {
      return false;
    }

    try {
      const healthUrl = this.getHealthCheckUrl(config);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private getHealthCheckUrl(config: ProviderConfig): string {
    const baseUrl = config.baseUrl!.replace(/\/$/, '');

    switch (config.name) {
      case 'ollama':
        return `${baseUrl}/api/tags`;
      case 'lm-studio':
        return `${baseUrl}/v1/models`;
      default:
        return `${baseUrl}/health`;
    }
  }

  private async testApiKeyConnection(config: ProviderConfig): Promise<boolean> {
    // API key connection testing would require making actual API calls
    // For now, just validate that we have credentials
    const credentials = await this.getCredentials(config.name);
    return !!(credentials && credentials.apiKey);
  }
}