/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import { Config, ConfigParameters, ApprovalMode } from './config.js';
import { ConfigManager } from './ConfigManager.js';
import { AuthType } from '../core/contentGenerator.js';
import { YoloModeValidator } from '../utils/yoloModeValidator.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { DEFAULT_GEMINI_EMBEDDING_MODEL, DEFAULT_GEMINI_MODEL } from './models.js';
import { DEFAULT_MEMORY_FILE_FILTERING_OPTIONS } from './config.js';
// Note: resolvePath will need to be imported from the appropriate location
// For now, using path.resolve as fallback
const resolvePath = (p: string) => path.resolve(p);

/**
 * Factory for creating Config instances using the unified ConfigManager
 * Maintains backward compatibility while using new configuration system
 */
export class ConfigFactory {
  private configManager: ConfigManager;

  constructor(workspaceDir?: string) {
    this.configManager = ConfigManager.getInstance(workspaceDir);
  }

  /**
   * Create a Config instance from CLI arguments and settings
   */
  public async createConfig(
    sessionId: string,
    cliArgs: CliArgumentsInterface = {}
  ): Promise<Config> {
    // Initialize ConfigManager if not already done
    await this.configManager.initialize();

    const settings = this.configManager.getSettings();
    
    // Extract common configuration values
    const debugMode = this.getDebugMode(cliArgs);
    const workspaceDir = process.cwd();
    
    // Handle include directories
    const includeDirectories = this.getIncludeDirectories(settings, cliArgs);
    
    // Create file discovery service
    const fileService = new FileDiscoveryService(workspaceDir);
    
    // Handle YOLO mode validation
    const approvalMode = await this.getApprovalMode(sessionId, settings, cliArgs);
    
    // Determine interactivity
    const interactive = this.getInteractiveMode(cliArgs);
    
    // Handle tool exclusions for non-interactive mode
    const excludeTools = this.getExcludeTools(settings, interactive, approvalMode);
    
    // Handle API keys from CLI
    this.handleCliApiKeys(cliArgs);
    
    // Build ConfigParameters
    const configParams: ConfigParameters = {
      sessionId,
      embeddingModel: settings.embeddingModel || DEFAULT_GEMINI_EMBEDDING_MODEL,
      targetDir: workspaceDir,
      includeDirectories,
      loadMemoryFromIncludeDirectories: settings.loadMemoryFromIncludeDirectories || false,
      debugMode,
      question: cliArgs.promptInteractive || cliArgs.prompt || '',
      fullContext: cliArgs.allFiles || cliArgs.all_files || false,
      coreTools: settings.coreTools,
      excludeTools,
      toolDiscoveryCommand: settings.toolDiscoveryCommand,
      toolCallCommand: settings.toolCallCommand,
      mcpServerCommand: settings.mcpServerCommand,
      mcpServers: settings.mcpServers,
      userMemory: '', // Will be loaded separately
      geminiMdFileCount: 0, // Will be set during memory loading
      approvalMode,
      showMemoryUsage: cliArgs.showMemoryUsage || cliArgs.show_memory_usage || settings.showMemoryUsage || false,
      accessibility: settings.accessibility,
      telemetry: {
        enabled: cliArgs.telemetry ?? settings.telemetry?.enabled,
        target: (cliArgs.telemetryTarget ?? settings.telemetry?.target) as any,
        otlpEndpoint: cliArgs.telemetryOtlpEndpoint ?? 
                     process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 
                     settings.telemetry?.otlpEndpoint,
        logPrompts: cliArgs.telemetryLogPrompts ?? settings.telemetry?.logPrompts,
        outfile: cliArgs.telemetryOutfile ?? settings.telemetry?.outfile,
      },
      usageStatisticsEnabled: settings.usageStatisticsEnabled ?? true,
      fileFiltering: {
        respectGitIgnore: settings.fileFiltering?.respectGitIgnore,
        respectGeminiIgnore: settings.fileFiltering?.respectGeminiIgnore,
        enableRecursiveFileSearch: settings.fileFiltering?.enableRecursiveFileSearch,
      },
      checkpointing: cliArgs.checkpointing || settings.checkpointing?.enabled,
      proxy: this.getProxy(cliArgs),
      cwd: workspaceDir,
      fileDiscoveryService: fileService,
      bugCommand: settings.bugCommand,
      model: cliArgs.model || settings.model || DEFAULT_GEMINI_MODEL,
      extensionContextFilePaths: [], // Will be handled by extension system
      maxSessionTurns: settings.maxSessionTurns ?? -1,
      sessionTokenLimit: settings.sessionTokenLimit ?? -1,
      experimentalAcp: cliArgs.experimentalAcp || false,
      listExtensions: cliArgs.listExtensions || false,
      extensions: [], // Will be handled by extension system
      blockedMcpServers: [], // Will be handled by MCP system
      noBrowser: !!process.env.NO_BROWSER,
      summarizeToolOutput: settings.summarizeToolOutput,
      ideMode: settings.ideMode ?? false,
      ideModeFeature: cliArgs.ideModeFeature ?? settings.ideModeFeature ?? false,
      folderTrustFeature: settings.folderTrustFeature ?? false,
      folderTrust: (settings.folderTrustFeature ?? false) && (settings.folderTrust ?? false),
      enableOpenAILogging: (typeof cliArgs.openaiLogging === 'undefined' 
        ? settings.enableOpenAILogging 
        : cliArgs.openaiLogging) ?? false,
      systemPromptMappings: settings.systemPromptMappings ?? this.getDefaultSystemPromptMappings(),
      contentGenerator: settings.contentGenerator,
      cliVersion: await this.getCliVersion(),
      tavilyApiKey: cliArgs.tavilyApiKey || settings.tavilyApiKey || process.env.TAVILY_API_KEY,
      chatCompression: settings.chatCompression,
      interactive,
    };

    return new Config(configParams);
  }

  /**
   * Get ConfigManager instance
   */
  public getConfigManager(): ConfigManager {
    return this.configManager;
  }

  // Private helper methods

  private getDebugMode(cliArgs: CliArgumentsInterface): boolean {
    return cliArgs.debug ||
           [process.env.DEBUG, process.env.DEBUG_MODE].some(v => v === 'true' || v === '1') ||
           false;
  }

  private getIncludeDirectories(settings: any, cliArgs: CliArgumentsInterface): string[] {
    const settingsIncludeDirs = (settings.includeDirectories || []).map(resolvePath);
    const cliIncludeDirs = (cliArgs.includeDirectories || []).map(resolvePath);
    return [...settingsIncludeDirs, ...cliIncludeDirs];
  }

  private async getApprovalMode(
    sessionId: string, 
    settings: any, 
    cliArgs: CliArgumentsInterface
  ): Promise<ApprovalMode> {
    const yoloValidator = new YoloModeValidator();
    const yoloFromConfig = settings.dangerouslySkipPermissions || false;
    
    const yoloValidation = yoloValidator.validateYoloModeActivation(
      sessionId,
      !!cliArgs.yolo,
      yoloFromConfig
    );

    if ((cliArgs.yolo || yoloFromConfig || process.env.QWEN_YOLO) && !yoloValidation.isValid) {
      throw new Error(yoloValidation.error || 'YOLO mode validation failed');
    }

    const approvalMode = yoloValidation.isValid ? ApprovalMode.YOLO : ApprovalMode.DEFAULT;

    if (approvalMode === ApprovalMode.YOLO) {
      yoloValidator.validateYoloContext(sessionId);
    }

    return approvalMode;
  }

  private getInteractiveMode(cliArgs: CliArgumentsInterface): boolean {
    const question = cliArgs.promptInteractive || cliArgs.prompt || '';
    return !!cliArgs.promptInteractive || (process.stdin.isTTY && question.length === 0);
  }

  private getExcludeTools(
    settings: any, 
    interactive: boolean, 
    approvalMode: ApprovalMode
  ): string[] {
    const settingsExcludes = settings.excludeTools || [];
    
    // In non-interactive and non-yolo mode, exclude interactive built-in tools
    const extraExcludes = (!interactive && approvalMode !== ApprovalMode.YOLO) 
      ? ['ShellTool', 'EditTool', 'WriteFileTool']
      : [];

    return [...settingsExcludes, ...extraExcludes];
  }

  private handleCliApiKeys(cliArgs: CliArgumentsInterface): void {
    if (cliArgs.openaiApiKey) {
      process.env.OPENAI_API_KEY = cliArgs.openaiApiKey;
    }
    if (cliArgs.openaiBaseUrl) {
      process.env.OPENAI_BASE_URL = cliArgs.openaiBaseUrl;
    }
    if (cliArgs.tavilyApiKey) {
      process.env.TAVILY_API_KEY = cliArgs.tavilyApiKey;
    }
  }

  private getProxy(cliArgs: CliArgumentsInterface): string | undefined {
    return cliArgs.proxy ||
           process.env.HTTPS_PROXY ||
           process.env.https_proxy ||
           process.env.HTTP_PROXY ||
           process.env.http_proxy;
  }

  private getDefaultSystemPromptMappings(): any[] {
    return [{
      baseUrls: [
        'https://dashscope.aliyuncs.com/compatible-mode/v1/',
        'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/',
      ],
      modelNames: ['qwen3-coder-plus'],
      template: 'SYSTEM_TEMPLATE:{"name":"qwen3_coder","params":{"is_git_repository":{RUNTIME_VARS_IS_GIT_REPO},"sandbox":"{RUNTIME_VARS_SANDBOX}"}}',
    }];
  }

  private async getCliVersion(): Promise<string> {
    try {
      // Try to read version from package.json as fallback
      const fs = await import('fs');
      const path = await import('path');
      
      // Look for package.json in multiple locations
      const possiblePaths = [
        path.join(process.cwd(), 'package.json'),
        path.join(__dirname, '../../../package.json'),
        path.join(__dirname, '../../../../package.json'),
      ];
      
      for (const packagePath of possiblePaths) {
        try {
          if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
            if (packageJson.version) {
              return packageJson.version;
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Fall through to default
    }
    return '1.0.0'; // Fallback version
  }
}

// Interface for CLI arguments (simplified)
export interface CliArgumentsInterface {
  model?: string;
  debug?: boolean;
  prompt?: string;
  promptInteractive?: string;
  allFiles?: boolean;
  all_files?: boolean;
  showMemoryUsage?: boolean;
  show_memory_usage?: boolean;
  yolo?: boolean;
  telemetry?: boolean;
  telemetryTarget?: string;
  telemetryOtlpEndpoint?: string;
  telemetryLogPrompts?: boolean;
  telemetryOutfile?: string;
  checkpointing?: boolean;
  experimentalAcp?: boolean;
  listExtensions?: boolean;
  ideModeFeature?: boolean;
  openaiLogging?: boolean;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  proxy?: string;
  includeDirectories?: string[];
  tavilyApiKey?: string;
}