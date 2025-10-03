/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@qwen-code/qwen-code-core';
import { loadEnvironment } from './settings.js';
import { credentialManager } from '@qwen-code/qwen-code-core/utils/credentialManager.js';
import { 
  getProviderManager, 
  getLegacyAuthAdapter,
  initializeProviderManager 
} from '@qwen-code/qwen-code-core/providers';

// Global instances - initialized lazily
let providerManagerInitialized = false;
let legacyAuthAdapter: any = null;

/**
 * Initialize the provider system
 */
async function ensureProviderSystemInitialized() {
  if (!providerManagerInitialized) {
    await initializeProviderManager();
    legacyAuthAdapter = getLegacyAuthAdapter();
    providerManagerInitialized = true;
  }
}

/**
 * Secure credential helper functions - maintained for backward compatibility
 */
export const getSecureCredential = async (key: string): Promise<string | null> => {
  return await credentialManager.getCredential(key);
};

export const setSecureCredential = async (key: string, value: string): Promise<void> => {
  await credentialManager.setCredential(key, value);
};

export const deleteSecureCredential = async (key: string): Promise<void> => {
  await credentialManager.deleteCredential(key);
};

export const isSecureStorageAvailable = async (): Promise<boolean> => {
  return await credentialManager.isSecureStorageAvailable();
};

export const getStorageType = (): string => {
  return credentialManager.getStorageType();
};

export const migrateCredentialFromEnvironment = async (key: string): Promise<boolean> => {
  return await credentialManager.migrateFromEnvironment(key);
};

/**
 * Enhanced auth validation using new provider system
 * Maintains backward compatibility with existing API
 */
export const validateAuthMethod = async (authMethod: string): Promise<string | null> => {
  loadEnvironment();
  
  try {
    // Initialize provider system if not already done
    await ensureProviderSystemInitialized();
    
    // Use new provider system for validation
    return await legacyAuthAdapter.validateAuthMethod(authMethod);
  } catch (error) {
    console.warn('New provider system validation failed, falling back to legacy validation:', error);
    
    // Fallback to legacy validation logic
    return await validateAuthMethodLegacy(authMethod);
  }
};

/**
 * Legacy validation logic - kept as fallback
 */
async function validateAuthMethodLegacy(authMethod: string): Promise<string | null> {
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.CLOUD_SHELL
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    const geminiKey = await getSecureCredential('GEMINI_API_KEY');
    if (!geminiKey) {
      return 'GEMINI_API_KEY is required. Please add it to your secure credential storage or .env file.';
    }
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    const hasVertexProjectLocationConfig =
      !!process.env.GOOGLE_CLOUD_PROJECT && !!process.env.GOOGLE_CLOUD_LOCATION;
    const googleApiKey = await getSecureCredential('GOOGLE_API_KEY');
    if (!hasVertexProjectLocationConfig && !googleApiKey) {
      return (
        'Vertex AI requires one of the following configurations:\n' +
        '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION for standard mode\n' +
        '• GOOGLE_API_KEY for express mode\n' +
        'Please add the required credentials to your secure storage or .env file.'
      );
    }
    return null;
  }

  if (authMethod === AuthType.USE_OPENAI) {
    const openaiKey = await getSecureCredential('OPENAI_API_KEY');
    if (!openaiKey) {
      return 'OPENAI_API_KEY is required. Please add it to your secure credential storage or .env file.';
    }
    return null;
  }

  if (authMethod === AuthType.QWEN_OAUTH) {
    return null;
  }

  if (authMethod === AuthType.USE_OLLAMA) {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    try {
      new URL(ollamaUrl);
      return null;
    } catch {
      return 'OLLAMA_BASE_URL must be a valid URL. Default: http://localhost:11434';
    }
  }

  if (authMethod === AuthType.USE_LM_STUDIO) {
    const lmStudioUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234';
    try {
      new URL(lmStudioUrl);
      return null;
    } catch {
      return 'LM_STUDIO_BASE_URL must be a valid URL. Default: http://localhost:1234';
    }
  }

  if (authMethod === AuthType.USE_RUNPOD) {
    const runpodKey = await getSecureCredential('RUNPOD_API_KEY');
    if (!runpodKey) {
      return 'RUNPOD_API_KEY is required. Please add it to your secure credential storage or .env file.';
    }
    const runpodUrl = await getSecureCredential('RUNPOD_BASE_URL') || process.env.RUNPOD_BASE_URL;
    if (!runpodUrl) {
      return 'RUNPOD_BASE_URL is required. Please add your RunPod endpoint URL to your secure storage or .env file.';
    }
    try {
      new URL(runpodUrl);
      return null;
    } catch {
      return 'RUNPOD_BASE_URL must be a valid URL. Please check your endpoint URL format.';
    }
  }

  return 'Invalid authentication method selected. Please choose a supported provider.';
}

/**
 * Enhanced credential setting functions using new provider system
 */
export const setOpenAIApiKey = async (apiKey: string): Promise<void> => {
  try {
    await ensureProviderSystemInitialized();
    await legacyAuthAdapter.setOpenAIApiKey(apiKey);
  } catch (error) {
    console.warn('New provider system failed, falling back to legacy credential storage:', error);
    await setSecureCredential('OPENAI_API_KEY', apiKey);
  }
};

export const setOpenAIBaseUrl = async (baseUrl: string): Promise<void> => {
  try {
    await ensureProviderSystemInitialized();
    await legacyAuthAdapter.setOpenAIBaseUrl(baseUrl);
  } catch (error) {
    console.warn('New provider system failed, falling back to legacy credential storage:', error);
    await setSecureCredential('OPENAI_BASE_URL', baseUrl);
  }
};

export const setOpenAIModel = async (model: string): Promise<void> => {
  await setSecureCredential('OPENAI_MODEL', model);
};

// Ollama configuration (URLs stored in env, no sensitive data)
export const setOllamaBaseUrl = (baseUrl: string): void => {
  try {
    ensureProviderSystemInitialized().then(() => {
      legacyAuthAdapter.setOllamaBaseUrl(baseUrl);
    }).catch(() => {
      process.env.OLLAMA_BASE_URL = baseUrl;
    });
  } catch {
    process.env.OLLAMA_BASE_URL = baseUrl;
  }
};

export const setOllamaModel = (model: string): void => {
  try {
    ensureProviderSystemInitialized().then(() => {
      legacyAuthAdapter.setOllamaModel(model);
    }).catch(() => {
      process.env.OLLAMA_MODEL = model;
    });
  } catch {
    process.env.OLLAMA_MODEL = model;
  }
};

// LM Studio configuration (URLs stored in env, no sensitive data)
export const setLmStudioBaseUrl = (baseUrl: string): void => {
  try {
    ensureProviderSystemInitialized().then(() => {
      legacyAuthAdapter.setLmStudioBaseUrl(baseUrl);
    }).catch(() => {
      process.env.LM_STUDIO_BASE_URL = baseUrl;
    });
  } catch {
    process.env.LM_STUDIO_BASE_URL = baseUrl;
  }
};

export const setLmStudioModel = (model: string): void => {
  try {
    ensureProviderSystemInitialized().then(() => {
      legacyAuthAdapter.setLmStudioModel(model);
    }).catch(() => {
      process.env.LM_STUDIO_MODEL = model;
    });
  } catch {
    process.env.LM_STUDIO_MODEL = model;
  }
};

// RunPod configuration (API keys in secure storage, URLs can be in env)
export const setRunPodApiKey = async (apiKey: string): Promise<void> => {
  try {
    await ensureProviderSystemInitialized();
    await legacyAuthAdapter.setRunPodApiKey(apiKey);
  } catch (error) {
    console.warn('New provider system failed, falling back to legacy credential storage:', error);
    await setSecureCredential('RUNPOD_API_KEY', apiKey);
  }
};

export const setRunPodBaseUrl = async (baseUrl: string): Promise<void> => {
  try {
    await ensureProviderSystemInitialized();
    await legacyAuthAdapter.setRunPodBaseUrl(baseUrl);
  } catch (error) {
    console.warn('New provider system failed, falling back to legacy credential storage:', error);
    await setSecureCredential('RUNPOD_BASE_URL', baseUrl);
  }
};

export const setRunPodModel = async (model: string): Promise<void> => {
  await setSecureCredential('RUNPOD_MODEL', model);
};

// Gemini configuration
export const setGeminiApiKey = async (apiKey: string): Promise<void> => {
  try {
    await ensureProviderSystemInitialized();
    await legacyAuthAdapter.setGeminiApiKey(apiKey);
  } catch (error) {
    console.warn('New provider system failed, falling back to legacy credential storage:', error);
    await setSecureCredential('GEMINI_API_KEY', apiKey);
  }
};

// Google API configuration  
export const setGoogleApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('GOOGLE_API_KEY', apiKey);
};

// Anthropic configuration
export const setAnthropicApiKey = async (apiKey: string): Promise<void> => {
  try {
    await ensureProviderSystemInitialized();
    await legacyAuthAdapter.setAnthropicApiKey(apiKey);
  } catch (error) {
    console.warn('New provider system failed, falling back to legacy credential storage:', error);
    await setSecureCredential('ANTHROPIC_API_KEY', apiKey);
  }
};

// xAI Grok configuration
export const setGrokApiKey = async (apiKey: string): Promise<void> => {
  try {
    await ensureProviderSystemInitialized();
    await legacyAuthAdapter.setGrokApiKey(apiKey);
  } catch (error) {
    console.warn('New provider system failed, falling back to legacy credential storage:', error);
    await setSecureCredential('GROK_API_KEY', apiKey);
  }
};

export const setXaiApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('XAI_API_KEY', apiKey);
};

/**
 * New provider system functions - enhanced functionality
 */

/**
 * Get available authentication methods (enhanced)
 */
export const getAvailableAuthMethods = async (): Promise<string[]> => {
  try {
    await ensureProviderSystemInitialized();
    return legacyAuthAdapter.getAvailableAuthMethods();
  } catch (error) {
    console.warn('Failed to get available auth methods from new system, using legacy list:', error);
    return [
      AuthType.LOGIN_WITH_GOOGLE,
      AuthType.USE_GEMINI,
      AuthType.USE_VERTEX_AI,
      AuthType.CLOUD_SHELL,
      AuthType.USE_OPENAI,
      AuthType.USE_ANTHROPIC,
      AuthType.USE_GROK,
      AuthType.QWEN_OAUTH,
      AuthType.USE_OLLAMA,
      AuthType.USE_LM_STUDIO,
      AuthType.USE_RUNPOD,
    ];
  }
};

/**
 * Test connection for a specific auth method
 */
export const testAuthMethodConnection = async (authMethod: string): Promise<boolean> => {
  try {
    await ensureProviderSystemInitialized();
    const providerManager = getProviderManager();
    const providerName = legacyAuthAdapter.mapLegacyAuthTypeToProvider(authMethod as any);
    
    if (providerName) {
      return await providerManager.testProviderConnection(providerName);
    }
    
    return false;
  } catch (error) {
    console.warn('Connection test failed:', error);
    return false;
  }
};

/**
 * Get migration recommendations for legacy configurations
 */
export const getMigrationRecommendations = async (authMethod?: string): Promise<string[]> => {
  try {
    await ensureProviderSystemInitialized();
    
    if (authMethod) {
      return legacyAuthAdapter.getMigrationRecommendations(authMethod);
    }
    
    // Check if migration is needed
    if (legacyAuthAdapter.needsMigration()) {
      return [
        'Legacy configuration detected. Consider migrating to the new provider system.',
        'Run migration: codeduet migrate-auth',
        'Benefits: Enhanced security, better credential management, simplified configuration.',
      ];
    }
    
    return [];
  } catch (error) {
    console.warn('Failed to get migration recommendations:', error);
    return [];
  }
};

/**
 * Migrate from legacy configuration
 */
export const migrateFromLegacyConfig = async (): Promise<{migrated: string[], errors: string[]}> => {
  try {
    await ensureProviderSystemInitialized();
    return await legacyAuthAdapter.migrateFromLegacyConfig();
  } catch (error) {
    return {
      migrated: [],
      errors: [error instanceof Error ? error.message : 'Migration failed'],
    };
  }
};