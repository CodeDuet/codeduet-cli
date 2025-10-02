/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@qwen-code/qwen-code-core';
import { loadEnvironment } from './settings.js';

export const validateAuthMethod = (authMethod: string): string | null => {
  loadEnvironment();
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.CLOUD_SHELL
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    if (!process.env.GEMINI_API_KEY) {
      return 'GEMINI_API_KEY environment variable not found. Add that to your environment and try again (no reload needed if using .env)!';
    }
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    const hasVertexProjectLocationConfig =
      !!process.env.GOOGLE_CLOUD_PROJECT && !!process.env.GOOGLE_CLOUD_LOCATION;
    const hasGoogleApiKey = !!process.env.GOOGLE_API_KEY;
    if (!hasVertexProjectLocationConfig && !hasGoogleApiKey) {
      return (
        'When using Vertex AI, you must specify either:\n' +
        '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
        '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  if (authMethod === AuthType.USE_OPENAI) {
    if (!process.env.OPENAI_API_KEY) {
      return 'OPENAI_API_KEY environment variable not found. You can enter it interactively or add it to your .env file.';
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
      return 'Invalid OLLAMA_BASE_URL. Please provide a valid URL (default: http://localhost:11434)';
    }
  }

  if (authMethod === AuthType.USE_LM_STUDIO) {
    // LM Studio doesn't require an API key, but we should check the base URL
    const lmStudioUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234';
    try {
      new URL(lmStudioUrl);
      return null;
    } catch {
      return 'Invalid LM_STUDIO_BASE_URL. Please provide a valid URL (default: http://localhost:1234)';
    }
  }

  if (authMethod === AuthType.USE_RUNPOD) {
    if (!process.env.RUNPOD_API_KEY) {
      return 'RUNPOD_API_KEY environment variable not found. Add that to your environment and try again!';
    }
    if (!process.env.RUNPOD_BASE_URL) {
      return 'RUNPOD_BASE_URL environment variable not found. Add your RunPod endpoint URL and try again!';
    }
    try {
      new URL(process.env.RUNPOD_BASE_URL);
      return null;
    } catch {
      return 'Invalid RUNPOD_BASE_URL. Please provide a valid URL';
    }
  }

  return 'Invalid auth method selected.';
};

export const setOpenAIApiKey = (apiKey: string): void => {
  process.env.OPENAI_API_KEY = apiKey;
};

export const setOpenAIBaseUrl = (baseUrl: string): void => {
  process.env.OPENAI_BASE_URL = baseUrl;
};

export const setOpenAIModel = (model: string): void => {
  process.env.OPENAI_MODEL = model;
};

// Ollama configuration
export const setOllamaBaseUrl = (baseUrl: string): void => {
  process.env.OLLAMA_BASE_URL = baseUrl;
};

export const setOllamaModel = (model: string): void => {
  process.env.OLLAMA_MODEL = model;
};

// LM Studio configuration
export const setLmStudioBaseUrl = (baseUrl: string): void => {
  process.env.LM_STUDIO_BASE_URL = baseUrl;
};

export const setLmStudioModel = (model: string): void => {
  process.env.LM_STUDIO_MODEL = model;
};

// RunPod configuration
export const setRunPodApiKey = (apiKey: string): void => {
  process.env.RUNPOD_API_KEY = apiKey;
};

export const setRunPodBaseUrl = (baseUrl: string): void => {
  process.env.RUNPOD_BASE_URL = baseUrl;
};

export const setRunPodModel = (model: string): void => {
  process.env.RUNPOD_MODEL = model;
};
