/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Enhanced path security utilities for preventing path traversal attacks
 */

export interface PathValidationResult {
  isValid: boolean;
  sanitizedPath?: string;
  error?: string;
}

/**
 * Comprehensive path validation to prevent path traversal attacks
 * @param filePath The file path to validate
 * @param workspaceDir The workspace directory
 * @returns PathValidationResult with validation status and sanitized path
 */
export function validateAndSanitizePath(
  filePath: string,
  workspaceDir: string,
): PathValidationResult {
  try {
    // Step 1: Basic validation
    if (!filePath || typeof filePath !== 'string') {
      return {
        isValid: false,
        error: 'File path is required and must be a string',
      };
    }

    // Step 2: Check for null bytes (can be used to bypass filters)
    if (filePath.includes('\0')) {
      return {
        isValid: false,
        error: 'File path contains null bytes, which is not allowed',
      };
    }

    // Step 3: Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\.[\\/]/,           // ../ or ..\
      /[\\/]\.\.$/,          // /.. or \.. at end
      /^\.\.[\\/]/,          // ../ or ..\ at start
      /^\.\.$/,              // Just ".."
      /~[\\/]/,              // Home directory references
      /\$[\({]?\w+[\)}]?/,   // Environment variable references
      /%[0-9a-fA-F]{2}/,     // URL encoded characters
      /\\x[0-9a-fA-F]{2}/,   // Hex encoded characters
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(filePath)) {
        return {
          isValid: false,
          error: `File path contains suspicious pattern: ${pattern.source}`,
        };
      }
    }

    // Step 4: Resolve and canonicalize paths
    let resolvedWorkspace: string;
    try {
      resolvedWorkspace = fs.realpathSync(workspaceDir);
    } catch (error) {
      // If workspace doesn't exist yet, use normalized path
      resolvedWorkspace = path.resolve(workspaceDir);
    }
    
    const resolvedFilePath = path.resolve(workspaceDir, filePath);

    // Step 5: Check if resolved path is within workspace
    if (!resolvedFilePath.startsWith(resolvedWorkspace + path.sep) && 
        resolvedFilePath !== resolvedWorkspace) {
      return {
        isValid: false,
        error: `Path traversal detected: resolved path '${resolvedFilePath}' is outside workspace '${resolvedWorkspace}'`,
      };
    }

    // Step 6: Additional symlink validation (if file exists)
    if (fs.existsSync(resolvedFilePath)) {
      try {
        const stats = fs.lstatSync(resolvedFilePath);
        if (stats.isSymbolicLink()) {
          const realPath = fs.realpathSync(resolvedFilePath);
          if (!realPath.startsWith(resolvedWorkspace + path.sep) && 
              realPath !== resolvedWorkspace) {
            return {
              isValid: false,
              error: `Symlink points outside workspace: '${realPath}' is outside '${resolvedWorkspace}'`,
            };
          }
        }
      } catch (error) {
        return {
          isValid: false,
          error: `Error validating symlink: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    return {
      isValid: true,
      sanitizedPath: resolvedFilePath,
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates file path for read operations with additional checks
 * @param filePath The file path to validate
 * @param workspaceDir The workspace directory
 * @returns PathValidationResult
 */
export function validateReadPath(
  filePath: string,
  workspaceDir: string,
): PathValidationResult {
  const baseValidation = validateAndSanitizePath(filePath, workspaceDir);
  
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const sanitizedPath = baseValidation.sanitizedPath!;

  // Additional checks for read operations
  try {
    if (!fs.existsSync(sanitizedPath)) {
      return {
        isValid: false,
        error: `File does not exist: ${sanitizedPath}`,
      };
    }

    const stats = fs.statSync(sanitizedPath);
    if (stats.isDirectory()) {
      return {
        isValid: false,
        error: `Path is a directory, not a file: ${sanitizedPath}`,
      };
    }

    // Check file permissions (readable)
    try {
      fs.accessSync(sanitizedPath, fs.constants.R_OK);
    } catch {
      return {
        isValid: false,
        error: `File is not readable: ${sanitizedPath}`,
      };
    }

    return {
      isValid: true,
      sanitizedPath,
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Read validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates file path for write operations with additional checks
 * @param filePath The file path to validate
 * @param workspaceDir The workspace directory
 * @returns PathValidationResult
 */
export function validateWritePath(
  filePath: string,
  workspaceDir: string,
): PathValidationResult {
  const baseValidation = validateAndSanitizePath(filePath, workspaceDir);
  
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  const sanitizedPath = baseValidation.sanitizedPath!;

  // Additional checks for write operations
  try {
    const parentDir = path.dirname(sanitizedPath);

    // Check if parent directory exists and is writable
    if (!fs.existsSync(parentDir)) {
      return {
        isValid: false,
        error: `Parent directory does not exist: ${parentDir}`,
      };
    }

    // Check parent directory permissions (writable)
    try {
      fs.accessSync(parentDir, fs.constants.W_OK);
    } catch {
      return {
        isValid: false,
        error: `Parent directory is not writable: ${parentDir}`,
      };
    }

    // If file exists, check if it's writable and not a directory
    if (fs.existsSync(sanitizedPath)) {
      const stats = fs.statSync(sanitizedPath);
      if (stats.isDirectory()) {
        return {
          isValid: false,
          error: `Path is a directory, not a file: ${sanitizedPath}`,
        };
      }

      try {
        fs.accessSync(sanitizedPath, fs.constants.W_OK);
      } catch {
        return {
          isValid: false,
          error: `File is not writable: ${sanitizedPath}`,
        };
      }
    }

    return {
      isValid: true,
      sanitizedPath,
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Write validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Checks if a file path contains potentially dangerous characteristics
 * @param filePath The file path to check
 * @returns Array of detected security issues
 */
export function detectPathSecurityIssues(filePath: string): string[] {
  const issues: string[] = [];

  // Check for various security issues
  if (filePath.includes('..')) {
    issues.push('Contains parent directory references (..)');
  }

  if (filePath.includes('\0')) {
    issues.push('Contains null bytes');
  }

  if (/[\x00-\x1f\x7f-\x9f]/.test(filePath)) {
    issues.push('Contains control characters');
  }

  if (filePath.includes('~')) {
    issues.push('Contains home directory reference (~)');
  }

  if (/\$[\({]?\w+[\)}]?/.test(filePath)) {
    issues.push('Contains environment variable references');
  }

  if (/%[0-9a-fA-F]{2}/.test(filePath)) {
    issues.push('Contains URL-encoded characters');
  }

  if (/\\x[0-9a-fA-F]{2}/.test(filePath)) {
    issues.push('Contains hex-encoded characters');
  }

  if (filePath.length > 4096) {
    issues.push('Path length exceeds safe limit (4096 characters)');
  }

  return issues;
}