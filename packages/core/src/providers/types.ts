/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unified provider authentication patterns
 * Consolidates 12 AuthTypes into 4 essential patterns
 */
export enum AuthProvider {
  GOOGLE_OAUTH = 'google-oauth',    // LOGIN_WITH_GOOGLE, USE_VERTEX_AI, CLOUD_SHELL
  API_KEY = 'api-key',             // USE_OPENAI, USE_ANTHROPIC, USE_GEMINI, USE_GROK, USE_RUNPOD
  LOCAL_HTTP = 'local-http',       // USE_OLLAMA, USE_LM_STUDIO
  LEGACY_OAUTH = 'legacy-oauth'    // QWEN_OAUTH (backward compatibility)
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  type: AuthProvider;
  name: string;
  displayName: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  additionalConfig?: Record<string, unknown>;
}

/**
 * Provider validation result
 */
export interface ProviderValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Provider authentication credentials
 */
export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  additionalCredentials?: Record<string, string>;
}

/**
 * Provider service interface for dependency injection
 */
export interface IProviderService {
  validateConfiguration(config: ProviderConfig): Promise<ProviderValidationResult>;
  getCredentials(providerName: string): Promise<ProviderCredentials | null>;
  setCredentials(providerName: string, credentials: ProviderCredentials): Promise<void>;
  deleteCredentials(providerName: string): Promise<void>;
  testConnection(config: ProviderConfig): Promise<boolean>;
}

/**
 * Base provider interface that all providers must implement
 */
export interface IProvider {
  readonly name: string;
  readonly type: AuthProvider;
  readonly displayName: string;
  readonly config: ProviderConfig;
  
  validate(): Promise<ProviderValidationResult>;
  initialize(): Promise<void>;
  getCredentials(): Promise<ProviderCredentials | null>;
  setCredentials(credentials: ProviderCredentials): Promise<void>;
  testConnection(): Promise<boolean>;
  cleanup(): Promise<void>;
}

/**
 * Provider factory interface
 */
export interface IProviderFactory {
  createProvider(config: ProviderConfig): IProvider;
  getSupportedTypes(): AuthProvider[];
}

/**
 * Legacy AuthType mapping for backward compatibility
 */
export enum LegacyAuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  USE_OPENAI = 'openai',
  USE_ANTHROPIC = 'anthropic',
  USE_GROK = 'grok',
  QWEN_OAUTH = 'qwen-oauth',
  USE_OLLAMA = 'ollama',
  USE_LM_STUDIO = 'lm-studio',
  USE_RUNPOD = 'runpod',
}

/**
 * Mapping from legacy AuthType to new AuthProvider
 */
export const LEGACY_AUTH_TYPE_MAPPING: Record<LegacyAuthType, AuthProvider> = {
  [LegacyAuthType.LOGIN_WITH_GOOGLE]: AuthProvider.GOOGLE_OAUTH,
  [LegacyAuthType.USE_VERTEX_AI]: AuthProvider.GOOGLE_OAUTH,
  [LegacyAuthType.CLOUD_SHELL]: AuthProvider.GOOGLE_OAUTH,
  [LegacyAuthType.USE_GEMINI]: AuthProvider.API_KEY,
  [LegacyAuthType.USE_OPENAI]: AuthProvider.API_KEY,
  [LegacyAuthType.USE_ANTHROPIC]: AuthProvider.API_KEY,
  [LegacyAuthType.USE_GROK]: AuthProvider.API_KEY,
  [LegacyAuthType.USE_RUNPOD]: AuthProvider.API_KEY,
  [LegacyAuthType.USE_OLLAMA]: AuthProvider.LOCAL_HTTP,
  [LegacyAuthType.USE_LM_STUDIO]: AuthProvider.LOCAL_HTTP,
  [LegacyAuthType.QWEN_OAUTH]: AuthProvider.LEGACY_OAUTH,
};

/**
 * Provider configuration templates for quick setup
 */
export const PROVIDER_TEMPLATES: Record<string, Partial<ProviderConfig>> = {
  'openai': {
    type: AuthProvider.API_KEY,
    name: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
  },
  'anthropic': {
    type: AuthProvider.API_KEY,
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-sonnet-20240229',
  },
  'gemini': {
    type: AuthProvider.API_KEY,
    name: 'gemini',
    displayName: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-pro',
  },
  'grok': {
    type: AuthProvider.API_KEY,
    name: 'grok',
    displayName: 'xAI Grok',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-beta',
  },
  'runpod': {
    type: AuthProvider.API_KEY,
    name: 'runpod',
    displayName: 'RunPod',
    model: 'meta-llama/Llama-2-70b-chat-hf',
  },
  'ollama': {
    type: AuthProvider.LOCAL_HTTP,
    name: 'ollama',
    displayName: 'Ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama2',
  },
  'lm-studio': {
    type: AuthProvider.LOCAL_HTTP,
    name: 'lm-studio',
    displayName: 'LM Studio',
    baseUrl: 'http://localhost:1234',
    model: 'local-model',
  },
  'google-oauth': {
    type: AuthProvider.GOOGLE_OAUTH,
    name: 'google-oauth',
    displayName: 'Google OAuth',
  },
  'qwen-oauth': {
    type: AuthProvider.LEGACY_OAUTH,
    name: 'qwen-oauth',
    displayName: 'Qwen OAuth (Legacy)',
  },
};