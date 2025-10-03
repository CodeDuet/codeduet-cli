/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { ConfigManager, SettingScope } from './ConfigManager.js';

// Mock dependencies
vi.mock('fs');
vi.mock('../utils/credentialManager.js', () => ({
  credentialManager: {
    getCredential: vi.fn(),
    setCredential: vi.fn(),
    deleteCredential: vi.fn(),
    isSecureStorageAvailable: vi.fn(),
    getStorageType: vi.fn(() => 'mock'),
  },
}));

vi.mock('../utils/errors.js', () => ({
  getErrorMessage: vi.fn((error) => error?.message || String(error)),
}));

describe('ConfigManager', () => {
  const mockFs = vi.mocked(fs);
  let configManager: ConfigManager;
  const testWorkspaceDir = '/test/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set required environment variables to avoid initialization errors
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-client-secret';
    
    // Reset singleton
    ConfigManager.prototype.reset();
    
    // Mock file system
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.realpathSync.mockImplementation((p) => p);
    mockFs.mkdirSync.mockImplementation(() => '');
    mockFs.writeFileSync.mockImplementation(() => {});
    
    // Mock homedir
    vi.mocked(homedir).mockReturnValue('/home/user');
    
    configManager = ConfigManager.getInstance(testWorkspaceDir);
  });

  afterEach(() => {
    configManager.reset();
    
    // Clean up environment variables
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  });

  describe('Singleton pattern', () => {
    it('should return the same instance for the same workspace', () => {
      const instance1 = ConfigManager.getInstance(testWorkspaceDir);
      const instance2 = ConfigManager.getInstance(testWorkspaceDir);
      expect(instance1).toBe(instance2);
    });

    it('should create new instance for different workspace', () => {
      const instance1 = ConfigManager.getInstance('/workspace1');
      const instance2 = ConfigManager.getInstance('/workspace2');
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize without errors when no config files exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await expect(configManager.initialize()).resolves.not.toThrow();
      
      const settings = configManager.getSettings();
      expect(settings).toEqual({
        customThemes: {},
        mcpServers: {},
        includeDirectories: [],
        chatCompression: {},
      });
    });

    it('should load and merge settings from all scopes', async () => {
      // Mock file existence
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('settings.json');
      });

      // Mock file contents
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('system')) {
          return JSON.stringify({ model: 'system-model', telemetry: { enabled: true } });
        }
        if (filePath.includes('.qwen/settings.json')) {
          return JSON.stringify({ model: 'user-model', theme: 'dark' });
        }
        if (filePath.includes('workspace')) {
          return JSON.stringify({ model: 'workspace-model', theme: 'light' });
        }
        return '{}';
      });

      await configManager.initialize();
      
      const settings = configManager.getSettings();
      
      // System settings should override (highest priority)
      expect(settings.model).toBe('system-model');
      expect(settings.telemetry?.enabled).toBe(true);
      
      // Workspace overrides user
      expect(settings.theme).toBe('light');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json {');
      
      await configManager.initialize();
      
      const errors = configManager.getErrors();
      expect(errors).toHaveLength(3); // system, user, workspace
      expect(errors[0].message).toContain('JSON');
    });

    it('should resolve environment variables in settings', async () => {
      process.env.TEST_VAR = 'test-value';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        model: '$TEST_VAR',
        baseUrl: '${TEST_VAR}/api',
      }));
      
      await configManager.initialize();
      
      const settings = configManager.getSettings();
      expect(settings.model).toBe('test-value');
      expect(settings.baseUrl).toBe('test-value/api');
      
      delete process.env.TEST_VAR;
    });
  });

  describe('Settings management', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should get setting values', () => {
      const settings = configManager.getSettings();
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('should get specific setting value', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ model: 'test-model' }));
      
      await configManager.initialize();
      
      const model = configManager.getSetting('model');
      expect(model).toBe('test-model');
    });

    it('should set and persist setting values', async () => {
      await configManager.setSetting('model', 'new-model', SettingScope.User);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.qwen/settings.json'),
        expect.stringContaining('new-model'),
        'utf-8'
      );
      
      const settings = configManager.getSettings();
      expect(settings.model).toBe('new-model');
    });

    it('should create directory when saving settings', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await configManager.setSetting('model', 'test', SettingScope.User);
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });
  });

  describe('Authentication validation', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should validate Google auth methods without credentials', async () => {
      const result1 = await configManager.validateAuthMethod('LOGIN_WITH_GOOGLE');
      const result2 = await configManager.validateAuthMethod('CLOUD_SHELL');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should validate Gemini auth with API key', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      vi.mocked(credentialManager.getCredential).mockResolvedValue('test-key');
      
      const result = await configManager.validateAuthMethod('USE_GEMINI');
      expect(result).toBeNull();
    });

    it('should fail Gemini auth without API key', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      vi.mocked(credentialManager.getCredential).mockResolvedValue(null);
      
      const result = await configManager.validateAuthMethod('USE_GEMINI');
      expect(result).toContain('GEMINI_API_KEY is required');
    });

    it('should validate Vertex AI with project config', async () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
      
      const result = await configManager.validateAuthMethod('USE_VERTEX_AI');
      expect(result).toBeNull();
      
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GOOGLE_CLOUD_LOCATION;
    });

    it('should validate OpenAI auth with API key', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      vi.mocked(credentialManager.getCredential).mockResolvedValue('sk-test');
      
      const result = await configManager.validateAuthMethod('USE_OPENAI');
      expect(result).toBeNull();
    });

    it('should validate Ollama with valid URL', async () => {
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
      
      const result = await configManager.validateAuthMethod('USE_OLLAMA');
      expect(result).toBeNull();
      
      delete process.env.OLLAMA_BASE_URL;
    });

    it('should fail Ollama with invalid URL', async () => {
      process.env.OLLAMA_BASE_URL = 'invalid-url';
      
      const result = await configManager.validateAuthMethod('USE_OLLAMA');
      expect(result).toContain('valid URL');
      
      delete process.env.OLLAMA_BASE_URL;
    });

    it('should validate RunPod with API key and URL', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      vi.mocked(credentialManager.getCredential).mockImplementation((key) => {
        if (key === 'RUNPOD_API_KEY') return Promise.resolve('test-key');
        if (key === 'RUNPOD_BASE_URL') return Promise.resolve('https://api.runpod.ai');
        return Promise.resolve(null);
      });
      
      const result = await configManager.validateAuthMethod('USE_RUNPOD');
      expect(result).toBeNull();
    });

    it('should return error for invalid auth method', async () => {
      const result = await configManager.validateAuthMethod('INVALID_METHOD');
      expect(result).toContain('Invalid authentication method');
    });
  });

  describe('Secure credential management', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should get secure credentials', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      vi.mocked(credentialManager.getCredential).mockResolvedValue('test-value');
      
      const result = await configManager.getSecureCredential('TEST_KEY');
      expect(result).toBe('test-value');
      expect(credentialManager.getCredential).toHaveBeenCalledWith('TEST_KEY');
    });

    it('should set secure credentials', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      
      await configManager.setSecureCredential('TEST_KEY', 'test-value');
      
      expect(credentialManager.setCredential).toHaveBeenCalledWith('TEST_KEY', 'test-value');
    });

    it('should delete secure credentials', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      
      await configManager.deleteSecureCredential('TEST_KEY');
      
      expect(credentialManager.deleteCredential).toHaveBeenCalledWith('TEST_KEY');
    });

    it('should check secure storage availability', async () => {
      const { credentialManager } = await import('../utils/credentialManager.js');
      vi.mocked(credentialManager.isSecureStorageAvailable).mockResolvedValue(true);
      
      const result = await configManager.isSecureStorageAvailable();
      expect(result).toBe(true);
    });

    it('should get storage type', () => {
      const result = configManager.getStorageType();
      expect(result).toBe('mock');
    });
  });

  describe('Environment file loading', () => {
    beforeEach(async () => {
      // Setup clean environment
      delete process.env.CLOUD_SHELL;
      delete process.env.GOOGLE_CLOUD_PROJECT;
    });

    it('should load .env file from workspace', async () => {
      const envPath = path.join(testWorkspaceDir, '.env');
      
      mockFs.existsSync.mockImplementation((filePath) => filePath === envPath);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === envPath) {
          return 'TEST_VAR=workspace-value\nANOTHER_VAR=test';
        }
        return '{}';
      });
      
      await configManager.initialize();
      
      expect(process.env.TEST_VAR).toBe('workspace-value');
      expect(process.env.ANOTHER_VAR).toBe('test');
    });

    it('should prefer qwen-specific .env files', async () => {
      const qwenEnvPath = path.join(testWorkspaceDir, '.qwen', '.env');
      const regularEnvPath = path.join(testWorkspaceDir, '.env');
      
      mockFs.existsSync.mockImplementation((filePath) => 
        filePath === qwenEnvPath || filePath === regularEnvPath
      );
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === qwenEnvPath) {
          return 'TEST_VAR=qwen-value';
        }
        if (filePath === regularEnvPath) {
          return 'TEST_VAR=regular-value';
        }
        return '{}';
      });
      
      await configManager.initialize();
      
      expect(process.env.TEST_VAR).toBe('qwen-value');
    });

    it('should handle Cloud Shell environment', async () => {
      process.env.CLOUD_SHELL = 'true';
      
      mockFs.existsSync.mockReturnValue(false);
      
      await configManager.initialize();
      
      expect(process.env.GOOGLE_CLOUD_PROJECT).toBe('cloudshell-gca');
    });

    it('should respect excluded environment variables', async () => {
      const envPath = path.join(testWorkspaceDir, '.env');
      
      mockFs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('settings.json')) return true;
        return filePath === envPath;
      });
      
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === envPath) {
          return 'DEBUG=true\nALLOWED_VAR=value';
        }
        if (filePath.includes('settings.json')) {
          return JSON.stringify({ excludedProjectEnvVars: ['DEBUG'] });
        }
        return '{}';
      });
      
      await configManager.initialize();
      
      expect(process.env.DEBUG).toBeUndefined();
      expect(process.env.ALLOWED_VAR).toBe('value');
    });
  });

  describe('Error handling', () => {
    it('should throw error when accessing settings before initialization', () => {
      const uninitializedManager = ConfigManager.getInstance('/new/workspace');
      
      expect(() => uninitializedManager.getSettings()).toThrow(
        'ConfigManager not initialized'
      );
    });

    it('should handle file write errors when saving settings', async () => {
      await configManager.initialize();
      
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      await expect(
        configManager.setSetting('model', 'test', SettingScope.User)
      ).rejects.toThrow('Failed to save settings');
    });

    it('should collect and return all configuration errors', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read failed');
      });
      
      await configManager.initialize();
      
      const errors = configManager.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Read failed');
    });
  });

  describe('Setting scopes', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should save to correct scope paths', async () => {
      await configManager.setSetting('model', 'system-model', SettingScope.System);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('QwenCode'),
        expect.any(String),
        'utf-8'
      );

      await configManager.setSetting('model', 'user-model', SettingScope.User);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.qwen/settings.json'),
        expect.any(String),
        'utf-8'
      );

      await configManager.setSetting('model', 'workspace-model', SettingScope.Workspace);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('workspace'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should merge settings with correct precedence', async () => {
      // Setup mock files with different values
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('system')) {
          return JSON.stringify({ 
            model: 'system-model', 
            theme: 'system-theme',
            includeDirectories: ['system-dir'],
          });
        }
        if (filePath.includes('.qwen/settings.json')) {
          return JSON.stringify({ 
            model: 'user-model',
            includeDirectories: ['user-dir'],
          });
        }
        if (filePath.includes('workspace')) {
          return JSON.stringify({ 
            theme: 'workspace-theme',
            includeDirectories: ['workspace-dir'],
          });
        }
        return '{}';
      });

      await configManager.initialize();
      
      const settings = configManager.getSettings();
      
      // System should override all
      expect(settings.model).toBe('system-model');
      expect(settings.theme).toBe('system-theme');
      
      // Include directories should merge all
      expect(settings.includeDirectories).toEqual([
        'system-dir',
        'user-dir', 
        'workspace-dir'
      ]);
    });
  });
});