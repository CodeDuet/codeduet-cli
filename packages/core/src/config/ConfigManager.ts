/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir, platform } from 'os';
import * as dotenv from 'dotenv';
import stripJsonComments from 'strip-json-comments';
import { AuthType } from '../core/contentGenerator.js';
import { credentialManager } from '../utils/credentialManager.js';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Unified Configuration Manager
 * Consolidates all configuration management into a single class
 * Target: 67% reduction from 3 separate config files
 */
export class ConfigManager {
  private static instances: Map<string, ConfigManager> = new Map();
  
  // Configuration state
  private systemSettings: ConfigSettings = {};
  private userSettings: ConfigSettings = {};
  private workspaceSettings: ConfigSettings = {};
  private mergedSettings: ConfigSettings = {};
  private settingsErrors: ConfigError[] = [];
  
  // Paths
  private readonly systemSettingsPath: string;
  private readonly userSettingsPath: string;
  private readonly workspaceSettingsPath: string;
  
  // Environment
  private envLoaded = false;

  private constructor(workspaceDir: string = process.cwd()) {
    this.systemSettingsPath = this.getSystemSettingsPath();
    this.userSettingsPath = path.join(homedir(), '.qwen', 'settings.json');
    this.workspaceSettingsPath = path.join(workspaceDir, '.qwen', 'settings.json');
  }

  /**
   * Get singleton instance of ConfigManager
   */
  public static getInstance(workspaceDir?: string): ConfigManager {
    const key = workspaceDir || process.cwd();
    
    if (!ConfigManager.instances.has(key)) {
      ConfigManager.instances.set(key, new ConfigManager(key));
    }
    
    return ConfigManager.instances.get(key)!;
  }

  /**
   * Initialize configuration system
   */
  public async initialize(): Promise<void> {
    this.loadSettingsFiles();
    this.mergeSettings();
    this.loadEnvironment();
    this.envLoaded = true;
  }

  /**
   * Get merged configuration settings
   */
  public getSettings(): ConfigSettings {
    if (!this.envLoaded) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
    return { ...this.mergedSettings };
  }

  /**
   * Get setting value with type safety
   */
  public getSetting<K extends keyof ConfigSettings>(key: K): ConfigSettings[K] {
    return this.mergedSettings[key];
  }

  /**
   * Set setting value and persist
   */
  public async setSetting<K extends keyof ConfigSettings>(
    key: K,
    value: ConfigSettings[K],
    scope: SettingScope = SettingScope.User
  ): Promise<void> {
    const targetSettings = this.getSettingsForScope(scope);
    targetSettings[key] = value;
    
    await this.saveSettings(scope);
    this.mergeSettings();
  }

  /**
   * Validate authentication method
   */
  public async validateAuthMethod(authMethod: string): Promise<string | null> {
    if (authMethod === AuthType.LOGIN_WITH_GOOGLE || authMethod === AuthType.CLOUD_SHELL) {
      return null;
    }

    if (authMethod === AuthType.USE_GEMINI) {
      const geminiKey = await this.getSecureCredential('GEMINI_API_KEY');
      if (!geminiKey) {
        return 'GEMINI_API_KEY is required. Please add it to your secure credential storage or .env file.';
      }
      return null;
    }

    if (authMethod === AuthType.USE_VERTEX_AI) {
      const hasVertexConfig = !!process.env.GOOGLE_CLOUD_PROJECT && !!process.env.GOOGLE_CLOUD_LOCATION;
      const googleApiKey = await this.getSecureCredential('GOOGLE_API_KEY');
      if (!hasVertexConfig && !googleApiKey) {
        return 'Vertex AI requires GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION or GOOGLE_API_KEY';
      }
      return null;
    }

    if (authMethod === AuthType.USE_OPENAI) {
      const openaiKey = await this.getSecureCredential('OPENAI_API_KEY');
      if (!openaiKey) {
        return 'OPENAI_API_KEY is required. Please add it to your secure credential storage or .env file.';
      }
      return null;
    }

    if (authMethod === AuthType.QWEN_OAUTH) {
      return null; // OAuth flow handles authentication
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
      const runpodKey = await this.getSecureCredential('RUNPOD_API_KEY');
      if (!runpodKey) {
        return 'RUNPOD_API_KEY is required. Please add it to your secure credential storage or .env file.';
      }
      const runpodUrl = await this.getSecureCredential('RUNPOD_BASE_URL') || process.env.RUNPOD_BASE_URL;
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
   * Secure credential management
   */
  public async getSecureCredential(key: string): Promise<string | null> {
    return await credentialManager.getCredential(key);
  }

  public async setSecureCredential(key: string, value: string): Promise<void> {
    await credentialManager.setCredential(key, value);
  }

  public async deleteSecureCredential(key: string): Promise<void> {
    await credentialManager.deleteCredential(key);
  }

  public async isSecureStorageAvailable(): Promise<boolean> {
    return await credentialManager.isSecureStorageAvailable();
  }

  public getStorageType(): string {
    return credentialManager.getStorageType();
  }

  /**
   * Get configuration errors
   */
  public getErrors(): ConfigError[] {
    return [...this.settingsErrors];
  }

  /**
   * Reset configuration (for testing)
   */
  public reset(): void {
    ConfigManager.instances.clear();
  }

  // Private methods

  private getSystemSettingsPath(): string {
    if (process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH) {
      return process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH;
    }
    if (platform() === 'darwin') {
      return '/Library/Application Support/QwenCode/settings.json';
    } else if (platform() === 'win32') {
      return 'C:\\ProgramData\\qwen-code\\settings.json';
    } else {
      return '/etc/qwen-code/settings.json';
    }
  }

  private loadSettingsFiles(): void {
    // Load system settings
    try {
      if (fs.existsSync(this.systemSettingsPath)) {
        const content = fs.readFileSync(this.systemSettingsPath, 'utf-8');
        const parsed = JSON.parse(stripJsonComments(content)) as ConfigSettings;
        this.systemSettings = this.resolveEnvVars(parsed);
      }
    } catch (error: unknown) {
      this.settingsErrors.push({
        message: getErrorMessage(error),
        path: this.systemSettingsPath,
      });
    }

    // Load user settings
    try {
      if (fs.existsSync(this.userSettingsPath)) {
        const content = fs.readFileSync(this.userSettingsPath, 'utf-8');
        const parsed = JSON.parse(stripJsonComments(content)) as ConfigSettings;
        this.userSettings = this.resolveEnvVars(parsed);
      }
    } catch (error: unknown) {
      this.settingsErrors.push({
        message: getErrorMessage(error),
        path: this.userSettingsPath,
      });
    }

    // Load workspace settings (only if not in home directory)
    let realWorkspaceDir: string;
    let realHomeDir: string;
    
    try {
      realWorkspaceDir = fs.realpathSync(path.dirname(this.workspaceSettingsPath));
    } catch {
      realWorkspaceDir = path.resolve(path.dirname(this.workspaceSettingsPath));
    }
    
    try {
      realHomeDir = fs.realpathSync(homedir());
    } catch {
      realHomeDir = path.resolve(homedir());
    }
    
    if (realWorkspaceDir !== realHomeDir) {
      try {
        if (fs.existsSync(this.workspaceSettingsPath)) {
          const content = fs.readFileSync(this.workspaceSettingsPath, 'utf-8');
          const parsed = JSON.parse(stripJsonComments(content)) as ConfigSettings;
          this.workspaceSettings = this.resolveEnvVars(parsed);
        }
      } catch (error: unknown) {
        this.settingsErrors.push({
          message: getErrorMessage(error),
          path: this.workspaceSettingsPath,
        });
      }
    }
  }

  private mergeSettings(): void {
    // System settings have highest priority, then workspace, then user
    // Remove folderTrust from workspace level (not supported)
    const { folderTrust, ...workspaceWithoutFolderTrust } = this.workspaceSettings;

    this.mergedSettings = {
      ...this.userSettings,
      ...workspaceWithoutFolderTrust,
      ...this.systemSettings,
      // Merge objects individually
      customThemes: {
        ...(this.userSettings.customThemes || {}),
        ...(this.workspaceSettings.customThemes || {}),
        ...(this.systemSettings.customThemes || {}),
      },
      mcpServers: {
        ...(this.userSettings.mcpServers || {}),
        ...(this.workspaceSettings.mcpServers || {}),
        ...(this.systemSettings.mcpServers || {}),
      },
      includeDirectories: [
        ...(this.systemSettings.includeDirectories || []),
        ...(this.userSettings.includeDirectories || []),
        ...(this.workspaceSettings.includeDirectories || []),
      ],
      chatCompression: {
        ...(this.systemSettings.chatCompression || {}),
        ...(this.userSettings.chatCompression || {}),
        ...(this.workspaceSettings.chatCompression || {}),
      },
    };
  }

  private getSettingsForScope(scope: SettingScope): ConfigSettings {
    switch (scope) {
      case SettingScope.System:
        return this.systemSettings;
      case SettingScope.User:
        return this.userSettings;
      case SettingScope.Workspace:
        return this.workspaceSettings;
      default:
        throw new Error(`Invalid scope: ${scope}`);
    }
  }

  private async saveSettings(scope: SettingScope): Promise<void> {
    const settings = this.getSettingsForScope(scope);
    const filePath = scope === SettingScope.System ? this.systemSettingsPath :
                    scope === SettingScope.User ? this.userSettingsPath :
                    this.workspaceSettingsPath;

    try {
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save settings to ${filePath}: ${getErrorMessage(error)}`);
    }
  }

  private resolveEnvVars<T>(obj: T): T {
    if (obj === null || obj === undefined || typeof obj === 'boolean' || typeof obj === 'number') {
      return obj;
    }

    if (typeof obj === 'string') {
      const envVarRegex = /\$(?:(\w+)|{([^}]+)})/g;
      return obj.replace(envVarRegex, (match, varName1, varName2) => {
        const varName = varName1 || varName2;
        return process.env[varName] || match;
      }) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveEnvVars(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const newObj = { ...obj } as T;
      for (const key in newObj) {
        if (Object.prototype.hasOwnProperty.call(newObj, key)) {
          newObj[key] = this.resolveEnvVars(newObj[key]);
        }
      }
      return newObj;
    }

    return obj;
  }

  private loadEnvironment(): void {
    const envFilePath = this.findEnvFile(process.cwd());

    // Cloud Shell special handling
    if (process.env.CLOUD_SHELL === 'true') {
      this.setUpCloudShellEnvironment(envFilePath);
    }

    if (envFilePath) {
      try {
        const envFileContent = fs.readFileSync(envFilePath, 'utf-8');
        const parsedEnv = dotenv.parse(envFileContent);

        const excludedVars = this.mergedSettings.excludedProjectEnvVars || ['DEBUG', 'DEBUG_MODE'];
        const isProjectEnvFile = !envFilePath.includes('.qwen');

        for (const key in parsedEnv) {
          if (Object.hasOwnProperty.call(parsedEnv, key)) {
            // Skip excluded variables in project .env files
            if (isProjectEnvFile && excludedVars.includes(key)) {
              continue;
            }

            // Only set if not already in environment
            if (!process.env[key]) {
              process.env[key] = parsedEnv[key];
            }
          }
        }
      } catch {
        // Ignore errors loading .env files
      }
    }
  }

  private findEnvFile(startDir: string): string | null {
    let currentDir = path.resolve(startDir);
    while (true) {
      // Prefer qwen-specific .env under .qwen dir
      const qwenEnvPath = path.join(currentDir, '.qwen', '.env');
      if (fs.existsSync(qwenEnvPath)) {
        return qwenEnvPath;
      }
      
      const envPath = path.join(currentDir, '.env');
      if (fs.existsSync(envPath)) {
        return envPath;
      }
      
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir || !parentDir) {
        // Check home directory as fallback
        const homeQwenEnvPath = path.join(homedir(), '.qwen', '.env');
        if (fs.existsSync(homeQwenEnvPath)) {
          return homeQwenEnvPath;
        }
        
        const homeEnvPath = path.join(homedir(), '.env');
        if (fs.existsSync(homeEnvPath)) {
          return homeEnvPath;
        }
        
        return null;
      }
      currentDir = parentDir;
    }
  }

  private setUpCloudShellEnvironment(envFilePath: string | null): void {
    if (envFilePath && fs.existsSync(envFilePath)) {
      const envFileContent = fs.readFileSync(envFilePath);
      const parsedEnv = dotenv.parse(envFileContent);
      if (parsedEnv.GOOGLE_CLOUD_PROJECT) {
        process.env.GOOGLE_CLOUD_PROJECT = parsedEnv.GOOGLE_CLOUD_PROJECT;
      } else {
        process.env.GOOGLE_CLOUD_PROJECT = 'cloudshell-gca';
      }
    } else {
      process.env.GOOGLE_CLOUD_PROJECT = 'cloudshell-gca';
    }
  }
}

// Types

export interface ConfigSettings {
  // Core settings
  model?: string;
  embeddingModel?: string;
  
  // Authentication
  dangerouslySkipPermissions?: boolean;
  
  // Memory and context
  contextFileName?: string | string[];
  memoryImportFormat?: 'flat' | 'tree';
  loadMemoryFromIncludeDirectories?: boolean;
  includeDirectories?: string[];
  
  // File filtering
  fileFiltering?: {
    respectGitIgnore?: boolean;
    respectGeminiIgnore?: boolean;
    enableRecursiveFileSearch?: boolean;
  };
  
  // Tools
  coreTools?: string[];
  excludeTools?: string[];
  toolDiscoveryCommand?: string;
  toolCallCommand?: string;
  
  // MCP servers
  mcpServers?: Record<string, any>;
  mcpServerCommand?: string;
  allowMCPServers?: string[];
  excludeMCPServers?: string[];
  
  // UI/UX
  theme?: string;
  customThemes?: Record<string, any>;
  accessibility?: {
    disableLoadingPhrases?: boolean;
  };
  showMemoryUsage?: boolean;
  
  // Features
  ideMode?: boolean;
  ideModeFeature?: boolean;
  folderTrustFeature?: boolean;
  folderTrust?: boolean;
  
  // Checkpointing
  checkpointing?: {
    enabled?: boolean;
  };
  
  // Telemetry
  telemetry?: {
    enabled?: boolean;
    target?: string;
    otlpEndpoint?: string;
    logPrompts?: boolean;
    outfile?: string;
  };
  usageStatisticsEnabled?: boolean;
  
  // Debugging
  enableOpenAILogging?: boolean;
  
  // Content generation
  contentGenerator?: {
    timeout?: number;
    maxRetries?: number;
    samplingParams?: Record<string, unknown>;
  };
  
  // Session limits
  maxSessionTurns?: number;
  sessionTokenLimit?: number;
  
  // System prompt mappings
  systemPromptMappings?: Array<{
    baseUrls?: string[];
    modelNames?: string[];
    template?: string;
  }>;
  
  // Tool output
  summarizeToolOutput?: Record<string, {
    tokenBudget?: number;
  }>;
  
  // Bug reporting
  bugCommand?: {
    urlTemplate: string;
  };
  
  // Chat compression
  chatCompression?: {
    contextPercentageThreshold?: number;
  };
  
  // Web search
  tavilyApiKey?: string;
  
  // Environment
  excludedProjectEnvVars?: string[];
  
  // Memory discovery
  memoryDiscoveryMaxDirs?: number;
}

export interface ConfigError {
  message: string;
  path: string;
}

export enum SettingScope {
  System = 'System',
  User = 'User', 
  Workspace = 'Workspace',
}