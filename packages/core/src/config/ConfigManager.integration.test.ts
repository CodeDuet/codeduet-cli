/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager, SettingScope } from './ConfigManager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager Integration', () => {
  let tempDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    
    // Set environment variables to avoid initialization errors
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-secret';
    
    // Reset singleton
    ConfigManager.prototype.reset();
    configManager = ConfigManager.getInstance(tempDir);
  });

  afterEach(() => {
    // Clean up
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
    
    configManager.reset();
    
    // Clean up environment variables
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  });

  describe('Basic functionality', () => {
    it('should initialize without errors when no config files exist', async () => {
      await expect(configManager.initialize()).resolves.not.toThrow();
      
      const settings = configManager.getSettings();
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('should return singleton instance', () => {
      const instance1 = ConfigManager.getInstance(tempDir);
      const instance2 = ConfigManager.getInstance(tempDir);
      expect(instance1).toBe(instance2);
    });

    it('should load settings from file when exists', async () => {
      // Create a settings file
      const settingsDir = path.join(tempDir, '.qwen');
      const settingsFile = path.join(settingsDir, 'settings.json');
      
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(settingsFile, JSON.stringify({
        model: 'test-model',
        theme: 'dark'
      }));

      await configManager.initialize();
      
      const settings = configManager.getSettings();
      expect(settings.model).toBe('test-model');
      expect(settings.theme).toBe('dark');
    });

    it('should handle JSON comments in settings files', async () => {
      const settingsDir = path.join(tempDir, '.qwen');
      const settingsFile = path.join(settingsDir, 'settings.json');
      
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(settingsFile, `{
        // This is a comment
        "model": "test-model",
        /* Another comment */
        "theme": "dark"
      }`);

      await configManager.initialize();
      
      const settings = configManager.getSettings();
      expect(settings.model).toBe('test-model');
      expect(settings.theme).toBe('dark');
    });

    it('should resolve environment variables in settings', async () => {
      process.env.TEST_MODEL = 'env-model';
      
      const settingsDir = path.join(tempDir, '.qwen');
      const settingsFile = path.join(settingsDir, 'settings.json');
      
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(settingsFile, JSON.stringify({
        model: '$TEST_MODEL',
        baseUrl: '${TEST_MODEL}/api'
      }));

      await configManager.initialize();
      
      const settings = configManager.getSettings();
      expect(settings.model).toBe('env-model');
      expect(settings.baseUrl).toBe('env-model/api');
      
      delete process.env.TEST_MODEL;
    });
  });

  describe('Settings persistence', () => {
    it('should save and retrieve settings', async () => {
      await configManager.initialize();
      
      await configManager.setSetting('model', 'new-model', SettingScope.User);
      
      const settings = configManager.getSettings();
      expect(settings.model).toBe('new-model');
      
      // Verify file was created
      const settingsFile = path.join(tempDir, '.qwen', 'settings.json');
      expect(fs.existsSync(settingsFile)).toBe(true);
      
      const fileContent = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      expect(fileContent.model).toBe('new-model');
    });

    it('should create directory when saving settings', async () => {
      await configManager.initialize();
      
      const settingsDir = path.join(tempDir, '.qwen');
      expect(fs.existsSync(settingsDir)).toBe(false);
      
      await configManager.setSetting('model', 'test', SettingScope.User);
      
      expect(fs.existsSync(settingsDir)).toBe(true);
    });
  });

  describe('Authentication validation', () => {
    it('should validate supported auth methods', async () => {
      await configManager.initialize();
      
      // Google auth should work without credentials
      const googleResult = await configManager.validateAuthMethod('LOGIN_WITH_GOOGLE');
      expect(googleResult).toBeNull();
      
      // Cloud Shell should work without credentials
      const cloudShellResult = await configManager.validateAuthMethod('CLOUD_SHELL');
      expect(cloudShellResult).toBeNull();
      
      // Qwen OAuth should work without credentials
      const qwenResult = await configManager.validateAuthMethod('QWEN_OAUTH');
      expect(qwenResult).toBeNull();
    });

    it('should validate Ollama with default URL', async () => {
      await configManager.initialize();
      
      const result = await configManager.validateAuthMethod('USE_OLLAMA');
      expect(result).toBeNull(); // Should pass with default localhost URL
    });

    it('should validate LM Studio with default URL', async () => {
      await configManager.initialize();
      
      const result = await configManager.validateAuthMethod('USE_LM_STUDIO');
      expect(result).toBeNull(); // Should pass with default localhost URL
    });

    it('should fail with invalid auth method', async () => {
      await configManager.initialize();
      
      const result = await configManager.validateAuthMethod('INVALID_METHOD');
      expect(result).toContain('Invalid authentication method');
    });
  });

  describe('Error handling', () => {
    it('should throw error when accessing settings before initialization', () => {
      expect(() => configManager.getSettings()).toThrow('ConfigManager not initialized');
    });

    it('should handle malformed JSON gracefully', async () => {
      const settingsDir = path.join(tempDir, '.qwen');
      const settingsFile = path.join(settingsDir, 'settings.json');
      
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(settingsFile, 'invalid json {');

      await configManager.initialize();
      
      const errors = configManager.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('JSON'))).toBe(true);
    });
  });

  describe('Environment file loading', () => {
    it('should load .env file from workspace', async () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 'TEST_VAR=workspace-value\nANOTHER_VAR=test');

      await configManager.initialize();
      
      expect(process.env.TEST_VAR).toBe('workspace-value');
      expect(process.env.ANOTHER_VAR).toBe('test');
      
      // Clean up
      delete process.env.TEST_VAR;
      delete process.env.ANOTHER_VAR;
    });

    it('should prefer qwen-specific .env files', async () => {
      const regularEnvFile = path.join(tempDir, '.env');
      const qwenEnvDir = path.join(tempDir, '.qwen');
      const qwenEnvFile = path.join(qwenEnvDir, '.env');
      
      fs.writeFileSync(regularEnvFile, 'TEST_VAR=regular-value');
      fs.mkdirSync(qwenEnvDir, { recursive: true });
      fs.writeFileSync(qwenEnvFile, 'TEST_VAR=qwen-value');

      await configManager.initialize();
      
      expect(process.env.TEST_VAR).toBe('qwen-value');
      
      // Clean up
      delete process.env.TEST_VAR;
    });
  });
});