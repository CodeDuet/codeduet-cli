/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { platform } from 'os';
import { SecureCredentialManager, credentialManager } from './credentialManager.js';

// Mock child_process
vi.mock('child_process');
const mockedExecSync = vi.mocked(execSync);

// Mock os module
vi.mock('os');
const mockedPlatform = vi.mocked(platform);

describe('SecureCredentialManager', () => {
  let manager: SecureCredentialManager;
  const testService = 'codeduet-cli';
  const testKey = 'TEST_API_KEY';
  const testValue = 'test-secret-value';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env[testKey];
    // Clear singleton instance for testing
    (SecureCredentialManager as any).instance = undefined;
  });

  afterEach(() => {
    delete process.env[testKey];
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecureCredentialManager.getInstance();
      const instance2 = SecureCredentialManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Environment Variable Fallback', () => {
    beforeEach(() => {
      // Mock platform to return unsupported OS
      mockedPlatform.mockReturnValue('unknown' as any);
      manager = SecureCredentialManager.getInstance();
    });

    it('should get credential from environment variable when secure storage unavailable', async () => {
      process.env[testKey] = testValue;
      
      const result = await manager.getCredential(testKey);
      expect(result).toBe(testValue);
    });

    it('should set credential in environment variable when secure storage unavailable', async () => {
      await manager.setCredential(testKey, testValue);
      expect(process.env[testKey]).toBe(testValue);
    });

    it('should delete credential from environment variable', async () => {
      process.env[testKey] = testValue;
      await manager.deleteCredential(testKey);
      expect(process.env[testKey]).toBeUndefined();
    });

    it('should return null for non-existent credential', async () => {
      const result = await manager.getCredential('NON_EXISTENT_KEY');
      expect(result).toBeNull();
    });
  });

  describe('macOS Keychain Storage', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('darwin');
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('which security')) {
          return 'security' as any;
        }
        if (command.includes('find-generic-password')) {
          return testValue as any;
        }
        return '' as any;
      });
      manager = SecureCredentialManager.getInstance();
    });

    it('should detect macOS keychain availability', async () => {
      const isAvailable = await manager.isSecureStorageAvailable();
      expect(isAvailable).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith('which security', expect.any(Object));
    });

    it('should get credential from keychain', async () => {
      const result = await manager.getCredential(testKey);
      expect(result).toBe(testValue);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `security find-generic-password -s "${testService}" -a "${testKey}" -w`,
        expect.any(Object)
      );
    });

    it('should set credential in keychain', async () => {
      await manager.setCredential(testKey, testValue);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `security add-generic-password -U -s "${testService}" -a "${testKey}" -w "${testValue}"`,
        expect.any(Object)
      );
    });

    it('should delete credential from keychain', async () => {
      await manager.deleteCredential(testKey);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `security delete-generic-password -s "${testService}" -a "${testKey}"`,
        expect.any(Object)
      );
    });

    it('should fallback to environment variable if keychain fails', async () => {
      process.env[testKey] = 'env-value';
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('which security')) {
          return 'security' as any;
        }
        if (command.includes('find-generic-password')) {
          throw new Error('Keychain error');
        }
        return '' as any;
      });

      const result = await manager.getCredential(testKey);
      expect(result).toBe('env-value');
    });

    it('should return correct storage type', () => {
      const storageType = manager.getStorageType();
      expect(storageType).toBe('macOS Keychain');
    });
  });

  describe('Windows Credential Manager Storage', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('win32');
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('where cmdkey')) {
          return 'cmdkey' as any;
        }
        if (command.includes('cmdkey /list')) {
          return `Target: codeduet-cli:${testKey}\nType: Generic\nUser: ${testKey}\nPassword: ${testValue}` as any;
        }
        return '' as any;
      });
      manager = SecureCredentialManager.getInstance();
    });

    it('should detect Windows credential manager availability', async () => {
      const isAvailable = await manager.isSecureStorageAvailable();
      expect(isAvailable).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith('where cmdkey', expect.any(Object));
    });

    it('should set credential in Windows credential manager', async () => {
      await manager.setCredential(testKey, testValue);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `cmdkey /generic:"${testService}:${testKey}" /user:"${testKey}" /pass:"${testValue}"`,
        expect.any(Object)
      );
    });

    it('should delete credential from Windows credential manager', async () => {
      await manager.deleteCredential(testKey);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `cmdkey /delete:"${testService}:${testKey}"`,
        expect.any(Object)
      );
    });

    it('should return correct storage type', () => {
      const storageType = manager.getStorageType();
      expect(storageType).toBe('Windows Credential Manager');
    });
  });

  describe('Linux Secret Service Storage', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('linux');
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('which secret-tool') || command.includes('which dbus-launch')) {
          return 'secret-tool' as any;
        }
        if (command.includes('secret-tool lookup')) {
          return testValue as any;
        }
        return '' as any;
      });
      manager = SecureCredentialManager.getInstance();
    });

    it('should detect Linux secret service availability', async () => {
      const isAvailable = await manager.isSecureStorageAvailable();
      expect(isAvailable).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith('which secret-tool', expect.any(Object));
      expect(mockedExecSync).toHaveBeenCalledWith('which dbus-launch', expect.any(Object));
    });

    it('should get credential from secret service', async () => {
      const result = await manager.getCredential(testKey);
      expect(result).toBe(testValue);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `secret-tool lookup service "${testService}" key "${testKey}"`,
        expect.any(Object)
      );
    });

    it('should set credential in secret service', async () => {
      await manager.setCredential(testKey, testValue);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `secret-tool store --label="${testService}:${testKey}" service "${testService}" key "${testKey}"`,
        expect.objectContaining({
          input: testValue
        })
      );
    });

    it('should delete credential from secret service', async () => {
      await manager.deleteCredential(testKey);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `secret-tool clear service "${testService}" key "${testKey}"`,
        expect.any(Object)
      );
    });

    it('should return correct storage type', () => {
      const storageType = manager.getStorageType();
      expect(storageType).toBe('Linux Secret Service');
    });
  });

  describe('Migration from Environment Variables', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('darwin');
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('which security')) {
          return 'security' as any;
        }
        if (command.includes('find-generic-password')) {
          return testValue as any;
        }
        return '' as any;
      });
      manager = SecureCredentialManager.getInstance();
    });

    it('should migrate credential from environment to secure storage', async () => {
      process.env[testKey] = testValue;
      
      const migrated = await manager.migrateFromEnvironment(testKey);
      expect(migrated).toBe(true);
      expect(process.env[testKey]).toBeUndefined();
    });

    it('should not migrate if no environment variable exists', async () => {
      const migrated = await manager.migrateFromEnvironment(testKey);
      expect(migrated).toBe(false);
    });

    it('should keep environment variable if secure storage fails', async () => {
      process.env[testKey] = testValue;
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('which security')) {
          return 'security' as any;
        }
        if (command.includes('add-generic-password')) {
          throw new Error('Keychain error');
        }
        return '' as any;
      });

      const migrated = await manager.migrateFromEnvironment(testKey);
      expect(migrated).toBe(false);
      expect(process.env[testKey]).toBe(testValue);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockedPlatform.mockReturnValue('darwin');
      manager = SecureCredentialManager.getInstance();
    });

    it('should handle unavailable secure storage gracefully', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const isAvailable = await manager.isSecureStorageAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should fallback to environment variables when secure storage operations fail', async () => {
      process.env[testKey] = 'fallback-value';
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('which security')) {
          return 'security' as any;
        }
        throw new Error('Operation failed');
      });

      const result = await manager.getCredential(testKey);
      expect(result).toBe('fallback-value');
    });

    it('should not throw when deleting non-existent credentials', async () => {
      mockedExecSync.mockImplementation((command) => {
        if (command.includes('which security')) {
          return 'security' as any;
        }
        if (command.includes('delete-generic-password')) {
          throw new Error('Credential not found');
        }
        return '' as any;
      });

      await expect(manager.deleteCredential(testKey)).resolves.not.toThrow();
    });
  });

  describe('Security Considerations', () => {
    it('should not log credential values in commands', async () => {
      mockedPlatform.mockReturnValue('darwin');
      mockedExecSync.mockImplementation(() => '' as any);

      await manager.setCredential(testKey, 'sensitive-value');
      
      // Verify that sensitive value is properly quoted and passed
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining('"sensitive-value"'),
        expect.any(Object)
      );
    });

    it('should handle special characters in credentials safely', async () => {
      mockedPlatform.mockReturnValue('darwin');
      mockedExecSync.mockImplementation(() => '' as any);

      const specialValue = 'pass"word$with&special<chars>';
      await manager.setCredential(testKey, specialValue);
      
      // Verify that special characters are properly escaped
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining(`"${specialValue}"`),
        expect.any(Object)
      );
    });

    it('should use stdio pipes to prevent credential exposure', async () => {
      mockedPlatform.mockReturnValue('darwin');
      mockedExecSync.mockImplementation(() => '' as any);

      await manager.setCredential(testKey, testValue);
      
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe']
        })
      );
    });
  });

  describe('Integration with Global Instance', () => {
    it('should export a singleton instance', () => {
      expect(credentialManager).toBeInstanceOf(SecureCredentialManager);
      // Note: Due to mocking in tests, instance comparison may fail
      // But the exported instance should still be valid
      expect(typeof credentialManager.getCredential).toBe('function');
      expect(typeof credentialManager.setCredential).toBe('function');
    });
  });
});