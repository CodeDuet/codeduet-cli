/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditLogger } from './auditLogger.js';

export interface InputValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: unknown;
  securityRisk?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationLimits {
  maxStringLength?: number;
  maxArrayLength?: number;
  maxObjectDepth?: number;
  maxNumberValue?: number;
  minNumberValue?: number;
  allowedPatterns?: RegExp[];
  blockedPatterns?: RegExp[];
  allowedMimeTypes?: string[];
  maxFileSize?: number;
}

export interface ValidationContext {
  toolName: string;
  parameterName: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Comprehensive input validation and sanitization system
 */
export class InputValidator {
  private static readonly DEFAULT_LIMITS: Required<ValidationLimits> = {
    maxStringLength: 100000, // 100KB for strings
    maxArrayLength: 1000,
    maxObjectDepth: 10,
    maxNumberValue: Number.MAX_SAFE_INTEGER,
    minNumberValue: Number.MIN_SAFE_INTEGER,
    allowedPatterns: [],
    blockedPatterns: [
      // Script injection patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      // SQL injection patterns
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b).*(\bFROM\b|\bWHERE\b|\bINTO\b)/gi,
      // Command injection patterns  
      /[;&|`$]/,
      // Shell command separators
      /\${[^}]*}/,
      // LDAP injection patterns (be more specific)
      /\([^)]*[&|!][^)]*\)/,
      // XPath injection patterns
      /['"\s]*\b(and|or)\b\s*['"]?\s*\w+\s*['"]?\s*[=!<>]/gi,
    ],
    allowedMimeTypes: [
      'text/plain',
      'text/html', 
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml',
      'text/xml',
      'text/markdown',
      'text/csv',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB
  };

  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = AuditLogger.getInstance();
  }

  /**
   * Validates and sanitizes input parameters with comprehensive security checks
   */
  public validateInput(
    value: unknown,
    limits: Partial<ValidationLimits> = {},
    context: ValidationContext,
  ): InputValidationResult {
    const mergedLimits = { ...InputValidator.DEFAULT_LIMITS, ...limits };
    
    try {
      // Check for null/undefined values
      if (value === null || value === undefined) {
        return { isValid: true, sanitizedValue: value };
      }

      // Validate by type
      const result = this.validateByType(value, mergedLimits, context);
      
      if (!result.isValid && result.securityRisk && result.securityRisk !== 'low') {
        this.auditLogger.logSecurityEvent(
          'INPUT_VALIDATION_FAILURE',
          {
            toolName: context.toolName,
            parameterName: context.parameterName,
            error: result.error,
            securityRisk: result.securityRisk,
            inputType: typeof value,
            inputLength: this.getInputLength(value),
          },
          result.securityRisk === 'critical' ? 'critical' : 'warn',
          context.sessionId,
        );
      }

      return result;
    } catch (error) {
      this.auditLogger.logSecurityEvent(
        'INPUT_VALIDATION_ERROR',
        {
          toolName: context.toolName,
          parameterName: context.parameterName,
          error: error instanceof Error ? error.message : String(error),
          securityRisk: 'high',
        },
        'error',
        context.sessionId,
      );

      return {
        isValid: false,
        error: 'Input validation failed due to internal error',
        securityRisk: 'high',
      };
    }
  }

  private validateByType(
    value: unknown,
    limits: Required<ValidationLimits>,
    context: ValidationContext,
  ): InputValidationResult {
    switch (typeof value) {
      case 'string':
        return this.validateString(value, limits, context);
      case 'number':
        return this.validateNumber(value, limits, context);
      case 'boolean':
        return { isValid: true, sanitizedValue: value };
      case 'object':
        if (Array.isArray(value)) {
          return this.validateArray(value, limits, context);
        }
        return this.validateObject(value, limits, context);
      default:
        return {
          isValid: false,
          error: `Unsupported input type: ${typeof value}`,
          securityRisk: 'medium',
        };
    }
  }

  private validateString(
    value: string,
    limits: Required<ValidationLimits>,
    context: ValidationContext,
  ): InputValidationResult {
    // Length validation
    if (value.length > limits.maxStringLength) {
      return {
        isValid: false,
        error: `String length (${value.length}) exceeds maximum allowed (${limits.maxStringLength})`,
        securityRisk: 'high',
      };
    }

    // If allowed patterns are specified, check them first (more restrictive)
    if (limits.allowedPatterns.length > 0) {
      const matchesAllowed = limits.allowedPatterns.some(pattern => pattern.test(value));
      if (!matchesAllowed) {
        return {
          isValid: false,
          error: 'String does not match any allowed patterns',
          securityRisk: 'medium',
        };
      }
    }

    // Then check blocked patterns (security threats)
    for (const pattern of limits.blockedPatterns) {
      if (pattern.test(value)) {
        return {
          isValid: false,
          error: `String contains blocked pattern: ${pattern.source}`,
          securityRisk: 'critical',
        };
      }
    }

    // Check for excessive whitespace DoS pattern
    if (/\s{1000,}/.test(value)) {
      return {
        isValid: false,
        error: 'String contains excessive whitespace',
        securityRisk: 'high',
      };
    }

    // Sanitize the string (remove control characters, normalize whitespace)
    const sanitized = this.sanitizeString(value);

    // Check if sanitization changed the string significantly (potential security issue)
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value);

    return {
      isValid: true,
      sanitizedValue: sanitized,
      securityRisk: hasControlChars ? 'low' : undefined,
    };
  }

  private validateNumber(
    value: number,
    limits: Required<ValidationLimits>,
    context: ValidationContext,
  ): InputValidationResult {
    // Check for NaN and Infinity
    if (!Number.isFinite(value)) {
      return {
        isValid: false,
        error: 'Number must be finite',
        securityRisk: 'medium',
      };
    }

    // Range validation
    if (value > limits.maxNumberValue || value < limits.minNumberValue) {
      return {
        isValid: false,
        error: `Number (${value}) is outside allowed range [${limits.minNumberValue}, ${limits.maxNumberValue}]`,
        securityRisk: 'high',
      };
    }

    return { isValid: true, sanitizedValue: value };
  }

  private validateArray(
    value: unknown[],
    limits: Required<ValidationLimits>,
    context: ValidationContext,
  ): InputValidationResult {
    // Length validation
    if (value.length > limits.maxArrayLength) {
      return {
        isValid: false,
        error: `Array length (${value.length}) exceeds maximum allowed (${limits.maxArrayLength})`,
        securityRisk: 'high',
      };
    }

    // Validate each element
    const sanitizedArray: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      const elementResult = this.validateByType(value[i], limits, {
        ...context,
        parameterName: `${context.parameterName}[${i}]`,
      });

      if (!elementResult.isValid) {
        return {
          isValid: false,
          error: `Array element at index ${i}: ${elementResult.error}`,
          securityRisk: elementResult.securityRisk,
        };
      }

      sanitizedArray.push(elementResult.sanitizedValue);
    }

    return { isValid: true, sanitizedValue: sanitizedArray };
  }

  private validateObject(
    value: object,
    limits: Required<ValidationLimits>,
    context: ValidationContext,
    depth: number = 0,
  ): InputValidationResult {
    // Depth validation
    if (depth >= limits.maxObjectDepth) {
      return {
        isValid: false,
        error: `Object nesting depth (${depth}) exceeds maximum allowed (${limits.maxObjectDepth})`,
        securityRisk: 'high',
      };
    }

    const sanitizedObject: Record<string, unknown> = {};
    
    for (const [key, val] of Object.entries(value)) {
      // Validate the key
      const keyResult = this.validateString(key, limits, {
        ...context,
        parameterName: `${context.parameterName}.${key}`,
      });

      if (!keyResult.isValid) {
        return {
          isValid: false,
          error: `Object key "${key}": ${keyResult.error}`,
          securityRisk: keyResult.securityRisk,
        };
      }

      // Validate the value
      let valueResult: InputValidationResult;
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        valueResult = this.validateObject(val, limits, context, depth + 1);
      } else {
        valueResult = this.validateByType(val, limits, {
          ...context,
          parameterName: `${context.parameterName}.${key}`,
        });
      }

      if (!valueResult.isValid) {
        return {
          isValid: false,
          error: `Object property "${key}": ${valueResult.error}`,
          securityRisk: valueResult.securityRisk,
        };
      }

      sanitizedObject[keyResult.sanitizedValue as string] = valueResult.sanitizedValue;
    }

    return { isValid: true, sanitizedValue: sanitizedObject };
  }


  private sanitizeString(value: string): string {
    // Remove null bytes and other control characters
    return value
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private getInputLength(value: unknown): number {
    if (typeof value === 'string') {
      return value.length;
    }
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length;
    }
    return 0;
  }

  /**
   * Validates file content with size and type restrictions
   */
  public validateFileContent(
    content: string | Buffer,
    mimeType?: string,
    limits: Partial<ValidationLimits> = {},
    context: ValidationContext,
  ): InputValidationResult {
    const mergedLimits = { ...InputValidator.DEFAULT_LIMITS, ...limits };
    
    // Size validation
    const size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8');
    if (size > mergedLimits.maxFileSize) {
      return {
        isValid: false,
        error: `File size (${size} bytes) exceeds maximum allowed (${mergedLimits.maxFileSize} bytes)`,
        securityRisk: 'high',
      };
    }

    // MIME type validation
    if (mimeType && !mergedLimits.allowedMimeTypes.includes(mimeType)) {
      return {
        isValid: false,
        error: `MIME type "${mimeType}" is not allowed`,
        securityRisk: 'medium',
      };
    }

    // Content validation for text files
    if (typeof content === 'string') {
      return this.validateString(content, mergedLimits, context);
    }

    return { isValid: true, sanitizedValue: content };
  }

  /**
   * Validates URL inputs with additional security checks
   */
  public validateUrl(
    url: string,
    allowedSchemes: string[] = ['http', 'https'],
    allowedDomains?: string[],
    context: ValidationContext,
  ): InputValidationResult {
    try {
      const urlObj = new URL(url);
      
      // Scheme validation
      if (!allowedSchemes.includes(urlObj.protocol.slice(0, -1))) {
        return {
          isValid: false,
          error: `URL scheme "${urlObj.protocol}" is not allowed`,
          securityRisk: 'high',
        };
      }

      // Domain validation
      if (allowedDomains && !allowedDomains.includes(urlObj.hostname)) {
        return {
          isValid: false,
          error: `Domain "${urlObj.hostname}" is not allowed`,
          securityRisk: 'medium',
        };
      }

      // Check for suspicious patterns
      if (this.containsSuspiciousUrlPatterns(url)) {
        return {
          isValid: false,
          error: 'URL contains suspicious patterns',
          securityRisk: 'high',
        };
      }

      return { isValid: true, sanitizedValue: url };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format',
        securityRisk: 'medium',
      };
    }
  }

  private containsSuspiciousUrlPatterns(url: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i,
      /@.*@/, // Multiple @ symbols
      /[<>'"]/,
      /[\x00-\x1F\x7F]/, // Control characters
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Creates tool-specific validation limits
   */
  public static createToolLimits(toolName: string): Partial<ValidationLimits> {
    switch (toolName) {
      case 'write_file':
      case 'edit':
        return {
          maxStringLength: 10 * 1024 * 1024, // 10MB for file content
          maxFileSize: 50 * 1024 * 1024, // 50MB file limit
        };
      
      case 'shell':
        return {
          maxStringLength: 10000, // Reasonable command length
          blockedPatterns: [
            /[;&|`$(){}[\]]/,
            /rm\s+-rf/i,
            /:\(\)\{.*\};:/,  // Fork bomb pattern
            /while\s+true/i,
            /for\s*\(\s*;\s*;\s*\)/i,
          ],
        };

      case 'web_fetch':
        return {
          maxStringLength: 10000, // URL and prompt limits
          allowedPatterns: [/^https?:\/\/.+/], // Must be HTTP/HTTPS
        };

      case 'grep':
      case 'ls':
      case 'glob':
        return {
          maxStringLength: 5000, // Pattern limits
          maxArrayLength: 100, // Reasonable file list size
        };

      default:
        return {};
    }
  }
}