/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import AjvPkg from 'ajv';
import { InputValidator, ValidationContext } from './inputValidator.js';

// Ajv's ESM/CJS interop: use 'any' for compatibility as recommended by Ajv docs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (AjvPkg as any).default || AjvPkg;
const ajValidator = new AjvClass();

/**
 * Enhanced utility to validate objects against JSON Schemas with security validation
 */
export class SchemaValidator {
  private static inputValidator = new InputValidator();

  /**
   * Returns null if the data conforms to the schema described by schema (or if schema
   * is null). Otherwise, returns a string describing the error.
   */
  static validate(schema: unknown | undefined, data: unknown): string | null {
    if (!schema) {
      return null;
    }
    if (typeof data !== 'object' || data === null) {
      return 'Value of params must be an object';
    }
    const validate = ajValidator.compile(schema);
    const valid = validate(data);
    if (!valid && validate.errors) {
      return ajValidator.errorsText(validate.errors, { dataVar: 'params' });
    }
    return null;
  }

  /**
   * Enhanced validation that includes both schema and security validation
   */
  static validateWithSecurity(
    schema: unknown | undefined,
    data: unknown,
    context: ValidationContext,
  ): { isValid: boolean; error?: string; sanitizedData?: unknown } {
    // First perform schema validation
    const schemaError = SchemaValidator.validate(schema, data);
    if (schemaError) {
      return { isValid: false, error: schemaError };
    }

    // Then perform security validation with tool-specific limits
    const limits = InputValidator.createToolLimits(context.toolName);
    const securityResult = SchemaValidator.inputValidator.validateInput(
      data,
      limits,
      context,
    );

    if (!securityResult.isValid) {
      return {
        isValid: false,
        error: `Security validation failed: ${securityResult.error}`,
      };
    }

    return {
      isValid: true,
      sanitizedData: securityResult.sanitizedValue,
    };
  }

  /**
   * Validates URL parameters with additional security checks
   */
  static validateUrl(
    url: string,
    context: ValidationContext,
    allowedSchemes?: string[],
    allowedDomains?: string[],
  ): { isValid: boolean; error?: string; sanitizedUrl?: string } {
    const result = SchemaValidator.inputValidator.validateUrl(
      url,
      allowedSchemes,
      allowedDomains,
      context,
    );

    return {
      isValid: result.isValid,
      error: result.error,
      sanitizedUrl: result.sanitizedValue as string,
    };
  }

  /**
   * Validates file content with size and type restrictions
   */
  static validateFileContent(
    content: string | Buffer,
    mimeType: string | undefined,
    context: ValidationContext,
  ): { isValid: boolean; error?: string; sanitizedContent?: string | Buffer } {
    const result = SchemaValidator.inputValidator.validateFileContent(
      content,
      mimeType,
      InputValidator.createToolLimits(context.toolName),
      context,
    );

    return {
      isValid: result.isValid,
      error: result.error,
      sanitizedContent: result.sanitizedValue as string | Buffer,
    };
  }
}
