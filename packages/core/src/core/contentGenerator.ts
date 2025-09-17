/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  GoogleGenAI,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_QWEN_MODEL } from '../config/models.js';
import { Config } from '../config/config.js';
import { getEffectiveModel } from './modelCheck.js';
import { UserTierId } from '../code_assist/types.js';
import { LoggingContentGenerator } from './loggingContentGenerator.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  userTier?: UserTierId;
}

export enum AuthType {
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

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  enableOpenAILogging?: boolean;
  // Timeout configuration in milliseconds
  timeout?: number;
  // Maximum retries for failed requests
  maxRetries?: number;
  samplingParams?: {
    top_p?: number;
    top_k?: number;
    repetition_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    temperature?: number;
    max_tokens?: number;
  };
  proxy?: string | undefined;
};

export function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): ContentGeneratorConfig {
  // google auth
  const geminiApiKey = process.env.GEMINI_API_KEY || undefined;
  const googleApiKey = process.env.GOOGLE_API_KEY || undefined;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION || undefined;

  // openai auth
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiBaseUrl = process.env.OPENAI_BASE_URL || undefined;
  const openaiModel = process.env.OPENAI_MODEL || undefined;

  // anthropic auth
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';

  // grok auth
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  const grokBaseUrl = process.env.GROK_BASE_URL || 'https://api.x.ai/v1';
  const grokModel = process.env.GROK_MODEL || 'grok-beta';

  // local model providers
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama2';
  const lmStudioBaseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234';
  const lmStudioModel = process.env.LM_STUDIO_MODEL || 'local-model';
  const runpodApiKey = process.env.RUNPOD_API_KEY;
  const runpodBaseUrl = process.env.RUNPOD_BASE_URL;
  const runpodModel = process.env.RUNPOD_MODEL;

  // Use runtime model from config if available; otherwise, fall back to parameter or default
  const effectiveModel = config.getModel() || DEFAULT_GEMINI_MODEL;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
    proxy: config?.getProxy(),
    enableOpenAILogging: config.getEnableOpenAILogging(),
    timeout: config.getContentGeneratorTimeout(),
    maxRetries: config.getContentGeneratorMaxRetries(),
    samplingParams: config.getContentGeneratorSamplingParams(),
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;
    getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
      contentGeneratorConfig.proxy,
    );

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_OPENAI && openaiApiKey) {
    contentGeneratorConfig.apiKey = openaiApiKey;
    contentGeneratorConfig.baseUrl = openaiBaseUrl;
    contentGeneratorConfig.model = openaiModel || DEFAULT_QWEN_MODEL;

    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_ANTHROPIC && anthropicApiKey) {
    contentGeneratorConfig.apiKey = anthropicApiKey;
    contentGeneratorConfig.baseUrl = anthropicBaseUrl;
    contentGeneratorConfig.model = anthropicModel;

    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GROK && grokApiKey) {
    contentGeneratorConfig.apiKey = grokApiKey;
    contentGeneratorConfig.baseUrl = grokBaseUrl;
    contentGeneratorConfig.model = grokModel;

    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_OLLAMA) {
    // Ollama doesn't require an API key, just a base URL
    contentGeneratorConfig.baseUrl = ollamaBaseUrl;
    contentGeneratorConfig.model = ollamaModel;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_LM_STUDIO) {
    // LM Studio doesn't require an API key, just a base URL
    contentGeneratorConfig.baseUrl = lmStudioBaseUrl;
    contentGeneratorConfig.model = lmStudioModel;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_RUNPOD && runpodApiKey && runpodBaseUrl) {
    contentGeneratorConfig.apiKey = runpodApiKey;
    contentGeneratorConfig.baseUrl = runpodBaseUrl;
    contentGeneratorConfig.model = runpodModel || 'default-model';
    return contentGeneratorConfig;
  }

  if (authType === AuthType.QWEN_OAUTH) {
    // For Qwen OAuth, we'll handle the API key dynamically in createContentGenerator
    // Set a special marker to indicate this is Qwen OAuth
    contentGeneratorConfig.apiKey = 'QWEN_OAUTH_DYNAMIC_TOKEN';

    // Prefer to use qwen3-coder-plus as the default Qwen model if QWEN_MODEL is not set.
    contentGeneratorConfig.model = process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL;

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = gcConfig.getCliVersion() || 'unknown';
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };
  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    return new LoggingContentGenerator(
      await createCodeAssistContentGenerator(
        httpOptions,
        config.authType,
        gcConfig,
        sessionId,
      ),
      gcConfig,
    );
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });
    return new LoggingContentGenerator(googleGenAI.models, gcConfig);
  }

  if (config.authType === AuthType.USE_OPENAI) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Import OpenAIContentGenerator dynamically to avoid circular dependencies
    const { OpenAIContentGenerator } = await import(
      './openaiContentGenerator.js'
    );

    // Always use OpenAIContentGenerator, logging is controlled by enableOpenAILogging flag
    return new OpenAIContentGenerator(config, gcConfig);
  }

  // Handle Anthropic separately (requires API key but has default base URL)
  if (config.authType === AuthType.USE_ANTHROPIC) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    // Import OpenAIContentGenerator dynamically to avoid circular dependencies
    const { OpenAIContentGenerator } = await import(
      './openaiContentGenerator.js'
    );

    return new OpenAIContentGenerator(config, gcConfig);
  }

  // Handle Grok separately (requires API key and uses OpenAI-compatible API)
  if (config.authType === AuthType.USE_GROK) {
    if (!config.apiKey) {
      throw new Error('Grok API key is required');
    }

    // Import OpenAIContentGenerator dynamically to avoid circular dependencies
    const { OpenAIContentGenerator } = await import(
      './openaiContentGenerator.js'
    );

    return new OpenAIContentGenerator(config, gcConfig);
  }

  // Handle local and remote OpenAI-compatible providers
  if (
    config.authType === AuthType.USE_OLLAMA ||
    config.authType === AuthType.USE_LM_STUDIO ||
    config.authType === AuthType.USE_RUNPOD
  ) {
    if (!config.baseUrl) {
      throw new Error(
        `Base URL is required for ${config.authType}. Please set the appropriate environment variable.`,
      );
    }

    // Import OpenAIContentGenerator dynamically to avoid circular dependencies
    const { OpenAIContentGenerator } = await import(
      './openaiContentGenerator.js'
    );

    return new OpenAIContentGenerator(config, gcConfig);
  }

  if (config.authType === AuthType.QWEN_OAUTH) {
    if (config.apiKey !== 'QWEN_OAUTH_DYNAMIC_TOKEN') {
      throw new Error('Invalid Qwen OAuth configuration');
    }

    // Import required classes dynamically
    const { getQwenOAuthClient: getQwenOauthClient } = await import(
      '../qwen/qwenOAuth2.js'
    );
    const { QwenContentGenerator } = await import(
      '../qwen/qwenContentGenerator.js'
    );

    try {
      // Get the Qwen OAuth client (now includes integrated token management)
      const qwenClient = await getQwenOauthClient(gcConfig);

      // Create the content generator with dynamic token management
      return new QwenContentGenerator(qwenClient, config, gcConfig);
    } catch (error) {
      throw new Error(
        `Failed to initialize Qwen: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}
