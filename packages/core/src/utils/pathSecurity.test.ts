/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { 
  validateAndSanitizePath, 
  detectPathSecurityIssues,
  validateReadPath,
  validateWritePath 
} from './pathSecurity.js';
import * as path from 'path';
import * as os from 'os';

describe('pathSecurity', () => {
  const workspaceDir = path.join(os.tmpdir(), 'test-workspace');

  describe('detectPathSecurityIssues', () => {
    it('should detect parent directory references', () => {
      const issues = detectPathSecurityIssues('../../../etc/passwd');
      expect(issues).toContain('Contains parent directory references (..)');
    });

    it('should detect null bytes', () => {
      const issues = detectPathSecurityIssues('file\0.txt');
      expect(issues).toContain('Contains null bytes');
    });

    it('should detect home directory references', () => {
      const issues = detectPathSecurityIssues('~/secret.txt');
      expect(issues).toContain('Contains home directory reference (~)');
    });

    it('should detect environment variable references', () => {
      const issues = detectPathSecurityIssues('$HOME/file.txt');
      expect(issues).toContain('Contains environment variable references');
    });

    it('should detect URL-encoded characters', () => {
      const issues = detectPathSecurityIssues('file%2E%2E/test.txt');
      expect(issues).toContain('Contains URL-encoded characters');
    });

    it('should detect hex-encoded characters', () => {
      const issues = detectPathSecurityIssues('file\\x2E\\x2E/test.txt');
      expect(issues).toContain('Contains hex-encoded characters');
    });

    it('should detect excessively long paths', () => {
      const longPath = 'a'.repeat(5000);
      const issues = detectPathSecurityIssues(longPath);
      expect(issues).toContain('Path length exceeds safe limit (4096 characters)');
    });

    it('should return empty array for safe paths', () => {
      const issues = detectPathSecurityIssues('/safe/path/to/file.txt');
      expect(issues).toEqual([]);
    });
  });

  describe('validateAndSanitizePath', () => {
    it('should reject empty or invalid paths', () => {
      const result = validateAndSanitizePath('', workspaceDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File path is required');
    });

    it('should reject non-string paths', () => {
      const result = validateAndSanitizePath(null as any, workspaceDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject paths with suspicious patterns', () => {
      const result = validateAndSanitizePath('../../../etc/passwd', workspaceDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('suspicious pattern');
    });

    it('should reject paths with null bytes', () => {
      const result = validateAndSanitizePath('file\0.txt', workspaceDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('null bytes');
    });
  });

  describe('path traversal prevention', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      './logs/../../../sensitive-file.txt',
      '~/secret.txt',
      '$HOME/secret.txt',
      'file%2E%2E/test.txt',
      'file\\x2E\\x2E/test.txt'
    ];

    maliciousPaths.forEach(maliciousPath => {
      it(`should reject malicious path: ${maliciousPath}`, () => {
        const issues = detectPathSecurityIssues(maliciousPath);
        expect(issues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('safe paths', () => {
    const safePaths = [
      '/workspace/safe/file.txt',
      'subdirectory/file.txt',
      './safe-file.txt',
      'file-with-dashes.txt',
      'file_with_underscores.txt',
      'file123.txt'
    ];

    safePaths.forEach(safePath => {
      it(`should accept safe path: ${safePath}`, () => {
        const issues = detectPathSecurityIssues(safePath);
        expect(issues).toEqual([]);
      });
    });
  });

  describe('advanced path traversal tests', () => {
    it('should detect Unicode path traversal attempts', () => {
      const issues = detectPathSecurityIssues('/test/\u002e\u002e/etc/passwd');
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should detect mixed encoding attacks', () => {
      const issues = detectPathSecurityIssues('/test/%2e%2e%2f..%2fetc%2fpasswd');
      expect(issues).toContain('Contains URL-encoded characters');
    });

    it('should detect double encoding attempts', () => {
      const issues = detectPathSecurityIssues('/test/%252e%252e%252f');
      expect(issues).toContain('Contains URL-encoded characters');
    });

    it('should detect backslash path traversal (Windows style)', () => {
      const issues = detectPathSecurityIssues('..\\..\\windows\\system32');
      expect(issues).toContain('Contains parent directory references (..)'); 
    });

    it('should detect shell injection attempts in paths', () => {
      const issues = detectPathSecurityIssues('/test/$(whoami).txt');
      expect(issues).toContain('Contains environment variable references');
    });

    it('should detect extremely long paths (DoS attempt)', () => {
      const longPath = '/test/' + 'a'.repeat(5000) + '.txt';
      const issues = detectPathSecurityIssues(longPath);
      expect(issues).toContain('Path length exceeds safe limit (4096 characters)');
    });

    it('should detect control character injection', () => {
      const pathWithControlChars = '/test/file\x00\x01\x1f.txt';
      const issues = detectPathSecurityIssues(pathWithControlChars);
      expect(issues).toContain('Contains control characters');
    });
  });

  describe('real path resolution security', () => {
    it('should reject paths outside workspace using real path resolution', () => {
      const testDir = path.join(os.tmpdir(), 'pathsecurity-test-' + Date.now());
      const outsidePath = '/etc/passwd';
      
      const result = validateAndSanitizePath(outsidePath, testDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('outside workspace');
    });
  });
});