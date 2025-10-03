/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { credentialManager } from './credentialManager.js';

/**
 * List of credential keys that should be migrated from environment variables
 * to secure storage
 */
export const SENSITIVE_CREDENTIAL_KEYS = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'ANTHROPIC_API_KEY',
  'GROK_API_KEY',
  'XAI_API_KEY',
  'RUNPOD_API_KEY',
] as const;

/**
 * List of configuration keys that can remain in environment variables
 * (non-sensitive configuration)
 */
export const NON_SENSITIVE_CONFIG_KEYS = [
  'OLLAMA_BASE_URL',
  'OLLAMA_MODEL',
  'LM_STUDIO_BASE_URL', 
  'LM_STUDIO_MODEL',
  'OPENAI_BASE_URL',
  'OPENAI_MODEL',
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_CLOUD_LOCATION',
  'RUNPOD_BASE_URL',  // URLs can be in env, but API keys should be secure
  'RUNPOD_MODEL',
] as const;

export interface MigrationResult {
  key: string;
  success: boolean;
  error?: string;
  hadValue: boolean;
}

export interface MigrationSummary {
  totalKeys: number;
  migratedKeys: number;
  failedKeys: number;
  skippedKeys: number;
  results: MigrationResult[];
  secureStorageAvailable: boolean;
  storageType: string;
}

/**
 * Migrates sensitive credentials from environment variables to secure storage
 */
export class CredentialMigrator {
  /**
   * Check if any sensitive credentials exist in environment variables
   */
  public static async checkForEnvironmentCredentials(): Promise<string[]> {
    const foundCredentials: string[] = [];
    
    for (const key of SENSITIVE_CREDENTIAL_KEYS) {
      if (process.env[key]) {
        foundCredentials.push(key);
      }
    }
    
    return foundCredentials;
  }

  /**
   * Migrate all sensitive credentials from environment to secure storage
   */
  public static async migrateAllCredentials(): Promise<MigrationSummary> {
    const results: MigrationResult[] = [];
    const secureStorageAvailable = await credentialManager.isSecureStorageAvailable();
    const storageType = credentialManager.getStorageType();

    for (const key of SENSITIVE_CREDENTIAL_KEYS) {
      const result = await this.migrateSingleCredential(key);
      results.push(result);
    }

    const migratedKeys = results.filter(r => r.success && r.hadValue).length;
    const failedKeys = results.filter(r => !r.success && r.hadValue).length;
    const skippedKeys = results.filter(r => !r.hadValue).length;

    return {
      totalKeys: SENSITIVE_CREDENTIAL_KEYS.length,
      migratedKeys,
      failedKeys,
      skippedKeys,
      results,
      secureStorageAvailable,
      storageType,
    };
  }

  /**
   * Migrate a single credential from environment to secure storage
   */
  public static async migrateSingleCredential(key: string): Promise<MigrationResult> {
    const hadValue = !!process.env[key];
    
    if (!hadValue) {
      return {
        key,
        success: true,
        hadValue: false,
      };
    }

    try {
      const migrated = await credentialManager.migrateFromEnvironment(key);
      return {
        key,
        success: migrated,
        hadValue: true,
        error: migrated ? undefined : 'Migration failed - credential kept in environment',
      };
    } catch (error) {
      return {
        key,
        success: false,
        hadValue: true,
        error: error instanceof Error ? error.message : 'Unknown error during migration',
      };
    }
  }

  /**
   * Generate a user-friendly migration report
   */
  public static generateMigrationReport(summary: MigrationSummary): string {
    const lines: string[] = [];
    
    lines.push('🔐 Credential Migration Report');
    lines.push('============================');
    lines.push('');
    
    lines.push(`Storage Type: ${summary.storageType}`);
    lines.push(`Secure Storage Available: ${summary.secureStorageAvailable ? 'Yes' : 'No'}`);
    lines.push('');
    
    lines.push(`Total Credential Keys Checked: ${summary.totalKeys}`);
    lines.push(`Successfully Migrated: ${summary.migratedKeys}`);
    lines.push(`Migration Failures: ${summary.failedKeys}`);
    lines.push(`No Value Found (Skipped): ${summary.skippedKeys}`);
    lines.push('');
    
    if (summary.migratedKeys > 0) {
      lines.push('✅ Successfully Migrated:');
      for (const result of summary.results) {
        if (result.success && result.hadValue) {
          lines.push(`  • ${result.key}`);
        }
      }
      lines.push('');
    }
    
    if (summary.failedKeys > 0) {
      lines.push('❌ Migration Failures:');
      for (const result of summary.results) {
        if (!result.success && result.hadValue) {
          lines.push(`  • ${result.key}: ${result.error || 'Unknown error'}`);
        }
      }
      lines.push('');
    }
    
    if (summary.skippedKeys > 0) {
      lines.push('ℹ️  No Environment Variables Found For:');
      for (const result of summary.results) {
        if (!result.hadValue) {
          lines.push(`  • ${result.key}`);
        }
      }
      lines.push('');
    }
    
    if (!summary.secureStorageAvailable) {
      lines.push('⚠️  Warning: Secure storage is not available on this system.');
      lines.push('   Credentials will continue to use environment variables.');
      lines.push('');
      
      // Add platform-specific installation instructions
      lines.push('To enable secure storage:');
      if (summary.storageType === 'Environment Variables') {
        lines.push('  • macOS: Ensure "security" command is available (usually pre-installed)');
        lines.push('  • Windows: Ensure "cmdkey" command is available (usually pre-installed)');
        lines.push('  • Linux: Install secret-tool (sudo apt-get install libsecret-tools)');
      }
      lines.push('');
    }
    
    lines.push('📚 Security Best Practices:');
    lines.push('  • Migrated credentials are encrypted using OS-level security');
    lines.push('  • Environment variables are used as fallback for compatibility');
    lines.push('  • Non-sensitive config (URLs, models) remain in environment variables');
    lines.push('  • You can re-run migration anytime with the --migrate-credentials flag');
    
    return lines.join('\n');
  }

  /**
   * Check if migration is recommended for the current environment
   */
  public static async isMigrationRecommended(): Promise<boolean> {
    const envCredentials = await this.checkForEnvironmentCredentials();
    const secureStorageAvailable = await credentialManager.isSecureStorageAvailable();
    
    return envCredentials.length > 0 && secureStorageAvailable;
  }

  /**
   * Get a summary of current credential storage status
   */
  public static async getCredentialStorageStatus(): Promise<{
    secureStorageAvailable: boolean;
    storageType: string;
    environmentCredentials: string[];
    recommendMigration: boolean;
  }> {
    const secureStorageAvailable = await credentialManager.isSecureStorageAvailable();
    const storageType = credentialManager.getStorageType();
    const environmentCredentials = await this.checkForEnvironmentCredentials();
    const recommendMigration = await this.isMigrationRecommended();

    return {
      secureStorageAvailable,
      storageType,
      environmentCredentials,
      recommendMigration,
    };
  }

  /**
   * Validate that all required credentials are available (from either source)
   */
  public static async validateCredentialAvailability(requiredKeys: string[]): Promise<{
    available: string[];
    missing: string[];
    sources: Record<string, 'secure' | 'environment' | 'missing'>;
  }> {
    const available: string[] = [];
    const missing: string[] = [];
    const sources: Record<string, 'secure' | 'environment' | 'missing'> = {};

    for (const key of requiredKeys) {
      const credential = await credentialManager.getCredential(key);
      if (credential) {
        available.push(key);
        // Check if it came from secure storage or environment
        const envValue = process.env[key];
        const secureValue = await credentialManager.isSecureStorageAvailable() 
          ? await credentialManager.getCredential(key) 
          : null;
        
        sources[key] = secureValue && secureValue !== envValue ? 'secure' : 'environment';
      } else {
        missing.push(key);
        sources[key] = 'missing';
      }
    }

    return { available, missing, sources };
  }
}

export const credentialMigrator = CredentialMigrator;