/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@qwen-code/qwen-code-core';
import { loadEnvironment } from './settings.js';
import { credentialManager } from '@qwen-code/qwen-code-core/utils/credentialManager.js';

/**
 * Secure credential helper functions
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

export const validateAuthMethod = async (authMethod: string): Promise<string | null> => {
  loadEnvironment();
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
    // Qwen OAuth doesn't require any environment variables for basic setup
    // The OAuth flow will handle authentication
    return null;
  }

  if (authMethod === AuthType.USE_OLLAMA) {
    // Ollama doesn't require an API key, but we should check if it's running
    // For now, just validate the base URL is set
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    try {
      new URL(ollamaUrl);
      return null;
    } catch {
      return 'OLLAMA_BASE_URL must be a valid URL. Default: http://localhost:11434';
    }
  }

  if (authMethod === AuthType.USE_LM_STUDIO) {
    // LM Studio doesn't require an API key, but we should check the base URL
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
};

export const setOpenAIApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('OPENAI_API_KEY', apiKey);
};

export const setOpenAIBaseUrl = async (baseUrl: string): Promise<void> => {
  await setSecureCredential('OPENAI_BASE_URL', baseUrl);
};

export const setOpenAIModel = async (model: string): Promise<void> => {
  await setSecureCredential('OPENAI_MODEL', model);
};

// Ollama configuration (URLs stored in env, no sensitive data)
export const setOllamaBaseUrl = (baseUrl: string): void => {
  process.env.OLLAMA_BASE_URL = baseUrl;
};

export const setOllamaModel = (model: string): void => {
  process.env.OLLAMA_MODEL = model;
};

// LM Studio configuration (URLs stored in env, no sensitive data)
export const setLmStudioBaseUrl = (baseUrl: string): void => {
  process.env.LM_STUDIO_BASE_URL = baseUrl;
};

export const setLmStudioModel = (model: string): void => {
  process.env.LM_STUDIO_MODEL = model;
};

// RunPod configuration (API keys in secure storage, URLs can be in env)
export const setRunPodApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('RUNPOD_API_KEY', apiKey);
};

export const setRunPodBaseUrl = async (baseUrl: string): Promise<void> => {
  await setSecureCredential('RUNPOD_BASE_URL', baseUrl);
};

export const setRunPodModel = async (model: string): Promise<void> => {
  await setSecureCredential('RUNPOD_MODEL', model);
};

// Gemini configuration
export const setGeminiApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('GEMINI_API_KEY', apiKey);
};

// Google API configuration  
export const setGoogleApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('GOOGLE_API_KEY', apiKey);
};

// Anthropic configuration
export const setAnthropicApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('ANTHROPIC_API_KEY', apiKey);
};

// xAI Grok configuration
export const setGrokApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('GROK_API_KEY', apiKey);
};

export const setXaiApiKey = async (apiKey: string): Promise<void> => {
  await setSecureCredential('XAI_API_KEY', apiKey);
};
