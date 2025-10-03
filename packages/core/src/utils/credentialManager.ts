/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'child_process';
import { platform } from 'os';

export interface CredentialStorage {
  get(service: string, key: string): Promise<string | null>;
  set(service: string, key: string, value: string): Promise<void>;
  delete(service: string, key: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

/**
 * Secure credential manager that uses OS-native credential storage
 * with fallback to environment variables for backward compatibility
 */
export class SecureCredentialManager {
  private static instance: SecureCredentialManager;
  private storage: CredentialStorage;
  private readonly serviceName = 'codeduet-cli';

  private constructor() {
    this.storage = this.createPlatformStorage();
  }

  public static getInstance(): SecureCredentialManager {
    if (!SecureCredentialManager.instance) {
      SecureCredentialManager.instance = new SecureCredentialManager();
    }
    return SecureCredentialManager.instance;
  }

  /**
   * Get a credential, checking secure storage first, then environment variables
   */
  public async getCredential(key: string): Promise<string | null> {
    try {
      // Try secure storage first
      if (await this.storage.isAvailable()) {
        const secureValue = await this.storage.get(this.serviceName, key);
        if (secureValue) {
          return secureValue;
        }
      }
    } catch (error) {
      // Fall through to environment variable check
    }

    // Fallback to environment variable
    return process.env[key] || null;
  }

  /**
   * Set a credential in secure storage with environment variable fallback
   */
  public async setCredential(key: string, value: string): Promise<void> {
    try {
      if (await this.storage.isAvailable()) {
        await this.storage.set(this.serviceName, key, value);
        return;
      }
    } catch (error) {
      // Fall through to environment variable storage
    }

    // Fallback to environment variable
    process.env[key] = value;
  }

  /**
   * Delete a credential from secure storage and environment
   */
  public async deleteCredential(key: string): Promise<void> {
    try {
      if (await this.storage.isAvailable()) {
        await this.storage.delete(this.serviceName, key);
      }
    } catch (error) {
      // Continue to delete from environment
    }

    // Also remove from environment
    delete process.env[key];
  }

  /**
   * Check if secure storage is available on this platform
   */
  public async isSecureStorageAvailable(): Promise<boolean> {
    return await this.storage.isAvailable();
  }

  /**
   * Migrate an existing environment variable to secure storage
   */
  public async migrateFromEnvironment(key: string): Promise<boolean> {
    const envValue = process.env[key];
    if (!envValue) {
      return false;
    }

    try {
      await this.setCredential(key, envValue);
      // Only delete from env if secure storage succeeded
      if (await this.storage.isAvailable()) {
        const storedValue = await this.storage.get(this.serviceName, key);
        if (storedValue === envValue) {
          delete process.env[key];
          return true;
        }
      }
    } catch (error) {
      // Migration failed, keep in environment
    }

    return false;
  }

  /**
   * Get storage type description for user feedback
   */
  public getStorageType(): string {
    const platformName = platform();
    switch (platformName) {
      case 'darwin':
        return 'macOS Keychain';
      case 'win32':
        return 'Windows Credential Manager';
      case 'linux':
        return 'Linux Secret Service';
      default:
        return 'Environment Variables';
    }
  }

  private createPlatformStorage(): CredentialStorage {
    const platformName = platform();
    switch (platformName) {
      case 'darwin':
        return new MacOSKeychainStorage();
      case 'win32':
        return new WindowsCredentialStorage();
      case 'linux':
        return new LinuxSecretStorage();
      default:
        return new EnvironmentVariableStorage();
    }
  }
}

/**
 * macOS Keychain implementation using security command
 */
class MacOSKeychainStorage implements CredentialStorage {
  async get(service: string, key: string): Promise<string | null> {
    try {
      const result = execSync(
        `security find-generic-password -s "${service}" -a "${key}" -w`,
        { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }
      ).trim();
      return result || null;
    } catch {
      return null;
    }
  }

  async set(service: string, key: string, value: string): Promise<void> {
    try {
      // First try to update existing
      execSync(
        `security add-generic-password -U -s "${service}" -a "${key}" -w "${value}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch {
      // If update fails, try to add new
      execSync(
        `security add-generic-password -s "${service}" -a "${key}" -w "${value}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
    }
  }

  async delete(service: string, key: string): Promise<void> {
    try {
      execSync(
        `security delete-generic-password -s "${service}" -a "${key}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch {
      // Ignore errors - credential might not exist
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      execSync('which security', { stdio: ['pipe', 'pipe', 'pipe'] });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Windows Credential Manager implementation using cmdkey
 */
class WindowsCredentialStorage implements CredentialStorage {
  private getTargetName(service: string, key: string): string {
    return `${service}:${key}`;
  }

  async get(service: string, key: string): Promise<string | null> {
    try {
      const target = this.getTargetName(service, key);
      const result = execSync(
        `cmdkey /list:"${target}"`,
        { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );
      
      // Parse cmdkey output to extract password
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.includes('Password:')) {
          return line.split('Password:')[1]?.trim() || null;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async set(service: string, key: string, value: string): Promise<void> {
    const target = this.getTargetName(service, key);
    execSync(
      `cmdkey /generic:"${target}" /user:"${key}" /pass:"${value}"`,
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );
  }

  async delete(service: string, key: string): Promise<void> {
    try {
      const target = this.getTargetName(service, key);
      execSync(
        `cmdkey /delete:"${target}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch {
      // Ignore errors - credential might not exist
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      execSync('where cmdkey', { stdio: ['pipe', 'pipe', 'pipe'] });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Linux Secret Service implementation using secret-tool
 */
class LinuxSecretStorage implements CredentialStorage {
  async get(service: string, key: string): Promise<string | null> {
    try {
      const result = execSync(
        `secret-tool lookup service "${service}" key "${key}"`,
        { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }
      ).trim();
      return result || null;
    } catch {
      return null;
    }
  }

  async set(service: string, key: string, value: string): Promise<void> {
    execSync(
      `secret-tool store --label="${service}:${key}" service "${service}" key "${key}"`,
      { 
        input: value,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
  }

  async delete(service: string, key: string): Promise<void> {
    try {
      execSync(
        `secret-tool clear service "${service}" key "${key}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch {
      // Ignore errors - credential might not exist
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      execSync('which secret-tool', { stdio: ['pipe', 'pipe', 'pipe'] });
      // Also check if dbus is available (required for secret service)
      execSync('which dbus-launch', { stdio: ['pipe', 'pipe', 'pipe'] });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Fallback implementation using environment variables
 */
class EnvironmentVariableStorage implements CredentialStorage {
  async get(service: string, key: string): Promise<string | null> {
    return process.env[key] || null;
  }

  async set(service: string, key: string, value: string): Promise<void> {
    process.env[key] = value;
  }

  async delete(service: string, key: string): Promise<void> {
    delete process.env[key];
  }

  async isAvailable(): Promise<boolean> {
    return true; // Environment variables are always available
  }
}

// Export the singleton instance
export const credentialManager = SecureCredentialManager.getInstance();