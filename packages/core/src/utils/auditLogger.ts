/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AuditEvent {
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
  user: string;
  pid: number;
  cwd: string;
  sessionId?: string;
  level: 'info' | 'warn' | 'error' | 'critical';
}

export class AuditLogger {
  private static instance: AuditLogger;
  private logDir: string;
  private logFile: string;

  private constructor() {
    this.logDir = path.join(os.homedir(), '.qwen', 'audit');
    this.logFile = path.join(this.logDir, 'security-audit.log');
    this.ensureLogDirectory();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true, mode: 0o700 });
      }
    } catch (error) {
      console.warn('Failed to create audit log directory:', error);
    }
  }

  private createAuditEvent(
    event: string,
    details: Record<string, unknown>,
    level: AuditEvent['level'] = 'info',
    sessionId?: string,
  ): AuditEvent {
    return {
      timestamp: new Date().toISOString(),
      event,
      details: { ...details },
      user: os.userInfo().username,
      pid: process.pid,
      cwd: process.cwd(),
      sessionId,
      level,
    };
  }

  public logSecurityEvent(
    event: string,
    details: Record<string, unknown>,
    level: AuditEvent['level'] = 'warn',
    sessionId?: string,
  ): void {
    const auditEvent = this.createAuditEvent(event, details, level, sessionId);
    
    // Log to console with color coding
    this.logToConsole(auditEvent);
    
    // Log to file
    this.logToFile(auditEvent);
  }

  private logToConsole(event: AuditEvent): void {
    const colorCodes = {
      info: '\x1b[36m',     // Cyan
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      critical: '\x1b[41m', // Red background
    };
    
    const resetCode = '\x1b[0m';
    const color = colorCodes[event.level];
    
    console.log(`${color}[AUDIT ${event.level.toUpperCase()}]${resetCode} ${event.event}`);
    
    if (event.level === 'critical' || event.level === 'error') {
      console.log(`  Timestamp: ${event.timestamp}`);
      console.log(`  User: ${event.user}`);
      console.log(`  Details:`, event.details);
    }
  }

  private logToFile(event: AuditEvent): void {
    try {
      const logLine = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.logFile, logLine, { mode: 0o600 });
    } catch (error) {
      console.warn('Failed to write audit log:', error);
    }
  }

  public logYoloModeActivation(sessionId: string, activationMethod: string): void {
    this.logSecurityEvent(
      'YOLO_MODE_ACTIVATED',
      {
        activationMethod,
        warning: 'All security controls bypassed',
        risk: 'HIGH',
      },
      'critical',
      sessionId,
    );
  }

  public logYoloModeOperation(
    sessionId: string,
    operation: string,
    command: string,
    bypassedChecks: string[],
  ): void {
    this.logSecurityEvent(
      'YOLO_MODE_OPERATION',
      {
        operation,
        command,
        bypassedChecks,
        risk: 'HIGH',
      },
      'warn',
      sessionId,
    );
  }

  public logSecurityValidationBypass(
    sessionId: string,
    validationType: string,
    originalValidation: string,
    bypassReason: string,
  ): void {
    this.logSecurityEvent(
      'SECURITY_VALIDATION_BYPASS',
      {
        validationType,
        originalValidation,
        bypassReason,
        risk: 'HIGH',
      },
      'error',
      sessionId,
    );
  }

  public logSuspiciousActivity(
    sessionId: string,
    activity: string,
    details: Record<string, unknown>,
  ): void {
    this.logSecurityEvent(
      'SUSPICIOUS_ACTIVITY',
      {
        activity,
        ...details,
        risk: 'MEDIUM',
      },
      'warn',
      sessionId,
    );
  }

  public logPathTraversalAttempt(
    sessionId: string,
    attemptedPath: string,
    securityIssues: string[],
  ): void {
    this.logSecurityEvent(
      'PATH_TRAVERSAL_ATTEMPT',
      {
        attemptedPath,
        securityIssues,
        risk: 'HIGH',
      },
      'error',
      sessionId,
    );
  }

  public logCommandInjectionAttempt(
    sessionId: string,
    attemptedCommand: string,
    detectedPatterns: string[],
  ): void {
    this.logSecurityEvent(
      'COMMAND_INJECTION_ATTEMPT',
      {
        attemptedCommand,
        detectedPatterns,
        risk: 'CRITICAL',
      },
      'critical',
      sessionId,
    );
  }

  public getAuditLogPath(): string {
    return this.logFile;
  }

  public rotateLogIfNeeded(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (stats.size > maxSize) {
          const rotatedFile = `${this.logFile}.${Date.now()}`;
          fs.renameSync(this.logFile, rotatedFile);
          
          // Keep only the last 5 rotated files
          this.cleanupOldLogs();
        }
      }
    } catch (error) {
      console.warn('Failed to rotate audit log:', error);
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('security-audit.log.'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          time: fs.statSync(path.join(this.logDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the 5 most recent files
      files.slice(5).forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.warn('Failed to cleanup old audit logs:', error);
    }
  }
}