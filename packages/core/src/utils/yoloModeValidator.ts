/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditLogger } from './auditLogger.js';
import { ApprovalMode } from '../config/config.js';

export interface YoloModeValidationResult {
  isValid: boolean;
  activationMethod?: string;
  error?: string;
  requiresConfirmation: boolean;
}

export class YoloModeValidator {
  private static readonly REQUIRED_CONFIRMATION_ENV = 'QWEN_YOLO_CONFIRMED';
  private static readonly YOLO_ENV_VAR = 'QWEN_YOLO';
  
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = AuditLogger.getInstance();
  }

  /**
   * Validates YOLO mode activation with strict security controls
   */
  public validateYoloModeActivation(
    sessionId: string,
    cliYolo: boolean = false,
    configYolo: boolean = false,
  ): YoloModeValidationResult {
    
    // Check environment variable activation
    const envYolo = this.isYoloEnabledByEnv();
    
    // Determine activation method
    const activationMethods: string[] = [];
    if (cliYolo) activationMethods.push('CLI_FLAG');
    if (configYolo) activationMethods.push('CONFIG_FILE');
    if (envYolo) activationMethods.push('ENVIRONMENT_VARIABLE');
    
    if (activationMethods.length === 0) {
      return {
        isValid: false,
        requiresConfirmation: false,
      };
    }

    const activationMethod = activationMethods.join(', ');

    // If YOLO is enabled via environment variable, require explicit confirmation
    if (envYolo && !this.isYoloConfirmed()) {
      const error = 'YOLO mode detected via environment variable but not confirmed. ' +
                   `Set ${YoloModeValidator.REQUIRED_CONFIRMATION_ENV}=1 to proceed. ` +
                   'WARNING: This bypasses ALL security controls.';
      
      this.auditLogger.logSecurityEvent(
        'YOLO_MODE_REJECTED',
        {
          reason: 'Missing confirmation',
          activationMethod,
          requiredEnvVar: YoloModeValidator.REQUIRED_CONFIRMATION_ENV,
        },
        'warn',
        sessionId,
      );

      return {
        isValid: false,
        error,
        requiresConfirmation: true,
      };
    }

    // Log successful YOLO mode activation
    this.auditLogger.logYoloModeActivation(sessionId, activationMethod);

    // Show prominent warning
    this.showYoloModeWarning();

    return {
      isValid: true,
      activationMethod,
      requiresConfirmation: false,
    };
  }

  /**
   * Checks if YOLO mode is enabled via environment variable
   */
  private isYoloEnabledByEnv(): boolean {
    const yoloValue = process.env[YoloModeValidator.YOLO_ENV_VAR];
    return ['1', 'true', 'yes'].includes(yoloValue?.toLowerCase() || '');
  }

  /**
   * Checks if YOLO mode has been explicitly confirmed
   */
  private isYoloConfirmed(): boolean {
    const confirmedValue = process.env[YoloModeValidator.REQUIRED_CONFIRMATION_ENV];
    return ['1', 'true', 'yes'].includes(confirmedValue?.toLowerCase() || '');
  }

  /**
   * Shows prominent YOLO mode warning
   */
  private showYoloModeWarning(): void {
    const warningBox = [
      '┌─────────────────────────────────────────────────────────────┐',
      '│                    🚨 YOLO MODE ACTIVE 🚨                  │',
      '│                                                             │',
      '│  ALL SECURITY CONTROLS HAVE BEEN BYPASSED                  │',
      '│                                                             │',
      '│  This mode automatically approves all operations without   │',
      '│  user confirmation, including:                              │',
      '│  • File system operations                                   │',
      '│  • Shell command execution                                  │',
      '│  • Network requests                                         │',
      '│  • Code modifications                                       │',
      '│                                                             │',
      '│  Use with extreme caution in trusted environments only!    │',
      '│                                                             │',
      '└─────────────────────────────────────────────────────────────┘',
    ];

    console.error('\x1b[41m\x1b[37m'); // Red background, white text
    warningBox.forEach(line => console.error(line));
    console.error('\x1b[0m'); // Reset colors
  }

  /**
   * Logs YOLO mode operations for audit trail
   */
  public logYoloOperation(
    sessionId: string,
    operation: string,
    command: string,
    bypassedChecks: string[],
  ): void {
    this.auditLogger.logYoloModeOperation(sessionId, operation, command, bypassedChecks);
  }

  /**
   * Validates if YOLO mode should be allowed in current context
   */
  public validateYoloContext(sessionId: string): boolean {
    // Additional context-based validations can be added here
    
    // Check if running in production-like environment
    if (this.isProductionEnvironment()) {
      this.auditLogger.logSecurityEvent(
        'YOLO_MODE_IN_PRODUCTION',
        {
          warning: 'YOLO mode attempted in production environment',
          recommendation: 'Consider disabling YOLO mode in production',
        },
        'critical',
        sessionId,
      );
      
      // Don't block, but log the critical security event
      return true;
    }

    return true;
  }

  /**
   * Detects if running in a production-like environment
   */
  private isProductionEnvironment(): boolean {
    const prodIndicators = [
      process.env.NODE_ENV === 'production',
      process.env.ENVIRONMENT === 'production',
      process.env.ENV === 'prod',
      !!process.env.CI, // Running in CI/CD
      !!process.env.KUBERNETES_SERVICE_HOST, // Running in Kubernetes
      !!process.env.AWS_LAMBDA_FUNCTION_NAME, // Running in AWS Lambda
    ];

    return prodIndicators.some(indicator => indicator);
  }

  /**
   * Gets helpful information about YOLO mode configuration
   */
  public getYoloModeInfo(): {
    envVarName: string;
    confirmationVarName: string;
    isActive: boolean;
    activationMethod?: string;
  } {
    const envYolo = this.isYoloEnabledByEnv();
    const confirmed = this.isYoloConfirmed();

    return {
      envVarName: YoloModeValidator.YOLO_ENV_VAR,
      confirmationVarName: YoloModeValidator.REQUIRED_CONFIRMATION_ENV,
      isActive: envYolo && confirmed,
      activationMethod: envYolo ? 'ENVIRONMENT_VARIABLE' : undefined,
    };
  }

  /**
   * Sets up environment variables programmatically (for testing/setup)
   */
  public static setYoloModeEnv(enabled: boolean, confirmed: boolean = false): void {
    if (enabled) {
      process.env[YoloModeValidator.YOLO_ENV_VAR] = '1';
      if (confirmed) {
        process.env[YoloModeValidator.REQUIRED_CONFIRMATION_ENV] = '1';
      }
    } else {
      delete process.env[YoloModeValidator.YOLO_ENV_VAR];
      delete process.env[YoloModeValidator.REQUIRED_CONFIRMATION_ENV];
    }
  }
}