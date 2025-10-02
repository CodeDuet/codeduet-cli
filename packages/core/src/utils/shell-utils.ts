/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';

/**
 * Splits a shell command into a list of individual commands, respecting quotes.
 * This is used to separate chained commands (e.g., using &&, ||, ;).
 * @param command The shell command string to parse
 * @returns An array of individual command strings
 */
export function splitCommands(command: string): string[] {
  const commands: string[] = [];
  let currentCommand = '';
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let i = 0;

  while (i < command.length) {
    const char = command[i];
    const nextChar = command[i + 1];

    if (char === '\\' && i < command.length - 1) {
      currentCommand += char + command[i + 1];
      i += 2;
      continue;
    }

    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
    } else if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
    }

    if (!inSingleQuotes && !inDoubleQuotes) {
      if (
        (char === '&' && nextChar === '&') ||
        (char === '|' && nextChar === '|')
      ) {
        commands.push(currentCommand.trim());
        currentCommand = '';
        i++; // Skip the next character
      } else if (char === ';' || char === '&' || char === '|') {
        commands.push(currentCommand.trim());
        currentCommand = '';
      } else {
        currentCommand += char;
      }
    } else {
      currentCommand += char;
    }
    i++;
  }

  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }

  return commands.filter(Boolean); // Filter out any empty strings
}

/**
 * Extracts the root command from a given shell command string.
 * This is used to identify the base command for permission checks.
 * @param command The shell command string to parse
 * @returns The root command name, or undefined if it cannot be determined
 * @example getCommandRoot("ls -la /tmp") returns "ls"
 * @example getCommandRoot("git status && npm test") returns "git"
 */
export function getCommandRoot(command: string): string | undefined {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    return undefined;
  }

  // This regex is designed to find the first "word" of a command,
  // while respecting quotes. It looks for a sequence of non-whitespace
  // characters that are not inside quotes.
  const match = trimmedCommand.match(/^"([^"]+)"|^'([^']+)'|^(\S+)/);
  if (match) {
    // The first element in the match array is the full match.
    // The subsequent elements are the capture groups.
    // We prefer a captured group because it will be unquoted.
    const commandRoot = match[1] || match[2] || match[3];
    if (commandRoot) {
      // If the command is a path, return the last component.
      return commandRoot.split(/[\\/]/).pop();
    }
  }

  return undefined;
}

export function getCommandRoots(command: string): string[] {
  if (!command) {
    return [];
  }
  return splitCommands(command)
    .map((c) => getCommandRoot(c))
    .filter((c): c is string => !!c);
}

export function stripShellWrapper(command: string): string {
  const pattern = /^\s*(?:sh|bash|zsh|cmd.exe)\s+(?:\/c|-c)\s+/;
  const match = command.match(pattern);
  if (match) {
    let newCommand = command.substring(match[0].length).trim();
    if (
      (newCommand.startsWith('"') && newCommand.endsWith('"')) ||
      (newCommand.startsWith("'") && newCommand.endsWith("'"))
    ) {
      newCommand = newCommand.substring(1, newCommand.length - 1);
    }
    return newCommand;
  }
  return command.trim();
}

/**
 * Detects command substitution patterns in a shell command, following bash quoting rules:
 * - Single quotes ('): Everything literal, no substitution possible
 * - Double quotes ("): Command substitution with $() and backticks unless escaped with \
 * - No quotes: Command substitution with $(), <(), >(), and backticks
 * Enhanced with comprehensive pattern detection to prevent bypass attempts.
 * @param command The shell command string to check
 * @returns true if command substitution would be executed by bash
 */
export function detectCommandSubstitution(command: string): boolean {
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let inBackticks = false;
  let i = 0;

  // Pre-check for obvious dangerous patterns that could be bypass attempts
  const dangerousPatterns = [
    /\$\([^)]*\)/,           // $(command)
    /`[^`]*`/,               // `command`
    /\$\{[^}]*\}/,           // ${var} and complex expansions
    /\$[A-Za-z_][A-Za-z0-9_]*/, // $VAR expansions
    /\$\[[^\]]*\]/,          // $[arithmetic] 
    /\$'\\.'/,               // $'string' with escapes
    /<\([^)]*\)/,            // <(command)
    />\([^)]*\)/,            // >(command)
    /\$\{IFS\}/,             // ${IFS} environment variable expansion
    /\$IFS/,                 // $IFS variable
    /\$'\\x[0-9a-fA-F]{2}'/,  // $'\x24' hex escapes
    /^\s*eval\s+/,           // eval command at start
    /^\s*exec\s+/,           // exec command at start
    /^\s*source\s+/,         // source command at start
    /^\s*\.\s+/,             // . (dot) command at start
  ];

  // Check for dangerous patterns first
  if (dangerousPatterns.some(pattern => pattern.test(command))) {
    return true;
  }

  // Check for encoded or obfuscated patterns
  if (containsEncodedCommands(command)) {
    return true;
  }

  while (i < command.length) {
    const char = command[i];
    const nextChar = command[i + 1];

    // Handle escaping - only works outside single quotes
    if (char === '\\' && !inSingleQuotes) {
      i += 2; // Skip the escaped character
      continue;
    }

    // Handle quote state changes
    if (char === "'" && !inDoubleQuotes && !inBackticks) {
      inSingleQuotes = !inSingleQuotes;
    } else if (char === '"' && !inSingleQuotes && !inBackticks) {
      inDoubleQuotes = !inDoubleQuotes;
    } else if (char === '`' && !inSingleQuotes) {
      // Backticks work outside single quotes (including in double quotes)
      inBackticks = !inBackticks;
    }

    // Check for command substitution patterns that would be executed
    if (!inSingleQuotes) {
      // $(...) command substitution - works in double quotes and unquoted
      if (char === '$' && nextChar === '(') {
        return true;
      }

      // <(...) process substitution - works unquoted only (not in double quotes)
      if (char === '<' && nextChar === '(' && !inDoubleQuotes && !inBackticks) {
        return true;
      }

      // >(...) process substitution - works unquoted only (not in double quotes) 
      if (char === '>' && nextChar === '(' && !inDoubleQuotes && !inBackticks) {
        return true;
      }

      // Backtick command substitution - check for opening backtick
      // (We track the state above, so this catches the start of backtick substitution)
      if (char === '`' && !inBackticks) {
        return true;
      }

      // Check for variable expansions that could be dangerous
      if (char === '$' && nextChar && nextChar.match(/[A-Za-z_\[{]/)) {
        return true;
      }
    }

    i++;
  }

  return false;
}

/**
 * Detects encoded or obfuscated command patterns that could bypass simple string matching
 * @param command The command string to check
 * @returns true if encoded patterns are detected
 */
function containsEncodedCommands(command: string): boolean {
  // Check for hex-encoded characters that could represent dangerous patterns
  const hexPattern = /\\x[0-9a-fA-F]{2}/;
  if (hexPattern.test(command)) {
    return true;
  }

  // Check for octal-encoded characters
  const octalPattern = /\\[0-7]{3}/;
  if (octalPattern.test(command)) {
    return true;
  }

  // Check for unicode escapes
  const unicodePattern = /\\u[0-9a-fA-F]{4}/;
  if (unicodePattern.test(command)) {
    return true;
  }

  // Check for base64-like patterns that might be decoded
  const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/;
  if (base64Pattern.test(command) && command.includes('base64')) {
    return true;
  }

  return false;
}

// Safe commands allowlist for enhanced security
// Commands that are generally safe for development workflows
const SAFE_COMMANDS = new Set([
  // File operations
  'ls', 'cat', 'echo', 'pwd', 'mkdir', 'cp', 'mv', 'rm', 'touch', 'ln',
  'head', 'tail', 'sort', 'uniq', 'wc', 'diff', 'file', 'stat', 'tree',
  
  // Text processing
  'grep', 'find', 'sed', 'awk', 'cut', 'tr', 'sort', 'uniq', 'wc',
  
  // Archive operations
  'tar', 'zip', 'unzip', 'gzip', 'gunzip',
  
  // Development tools
  'git', 'npm', 'node', 'python', 'python3', 'pip', 'pip3', 'yarn', 'pnpm',
  'make', 'cmake', 'gcc', 'g++', 'clang', 'javac', 'java', 'rustc', 'cargo',
  'go', 'dotnet', 'php', 'ruby', 'perl', 'lua', 'R', 'julia', 'scala', 'kotlin',
  'mvn', 'gradle', 'ant', 'sbt', 'lein', 'stack', 'cabal',
  
  // System info (read-only)
  'which', 'whereis', 'type', 'whoami', 'id', 'groups', 'date', 'uptime',
  'df', 'du', 'free', 'ps', 'top', 'htop', 'env', 'printenv',
  
  // Editors and viewers
  'vim', 'nano', 'emacs', 'less', 'more', 'view', 'code', 'subl',
  
  // Network tools (limited)
  'curl', 'wget', 'ping',
  
  // Help and documentation
  'help', 'man', 'info',
  
  // Process management (limited)
  'jobs', 'bg', 'fg', 'nohup',
]);

/**
 * Validates if a command root is in the safe commands allowlist
 * @param commandRoot The root command to validate
 * @returns true if the command is considered safe
 */
export function isSafeCommand(commandRoot: string): boolean {
  return SAFE_COMMANDS.has(commandRoot);
}

/**
 * Validates command against safe allowlist in strict mode
 * @param command The full command to validate
 * @returns Object with validation result and reason if blocked
 */
export function validateCommandSafety(command: string): { 
  allowed: boolean; 
  reason?: string; 
  unsafeCommands?: string[]; 
} {
  const commandRoots = getCommandRoots(command);
  const unsafeCommands = commandRoots.filter(root => !isSafeCommand(root));
  
  if (unsafeCommands.length > 0) {
    return {
      allowed: false,
      reason: `Unsafe commands detected: ${unsafeCommands.join(', ')}. Only allowlisted commands are permitted.`,
      unsafeCommands
    };
  }
  
  return { allowed: true };
}

/**
 * Checks a shell command against security policies and allowlists.
 *
 * This function operates in one of two modes depending on the presence of
 * the `sessionAllowlist` parameter:
 *
 * 1.  **"Default Deny" Mode (sessionAllowlist is provided):** This is the
 *     strictest mode, used for user-defined scripts like custom commands.
 *     A command is only permitted if it is found on the global `coreTools`
 *     allowlist OR the provided `sessionAllowlist`. It must not be on the
 *     global `excludeTools` blocklist.
 *
 * 2.  **"Default Allow" Mode (sessionAllowlist is NOT provided):** This mode
 *     is used for direct tool invocations (e.g., by the model). If a strict
 *     global `coreTools` allowlist exists, commands must be on it. Otherwise,
 *     any command is permitted as long as it is not on the `excludeTools`
 *     blocklist.
 *
 * @param command The shell command string to validate.
 * @param config The application configuration.
 * @param sessionAllowlist A session-level list of approved commands. Its
 *   presence activates "Default Deny" mode.
 * @returns An object detailing which commands are not allowed.
 */
export function checkCommandPermissions(
  command: string,
  config: Config,
  sessionAllowlist?: Set<string>,
): {
  allAllowed: boolean;
  disallowedCommands: string[];
  blockReason?: string;
  isHardDenial?: boolean;
} {
  // Disallow command substitution for security.
  if (detectCommandSubstitution(command)) {
    return {
      allAllowed: false,
      disallowedCommands: [command],
      blockReason:
        'Command substitution, variable expansion, or encoded patterns detected. This is not allowed for security reasons.',
      isHardDenial: true,
    };
  }

  // Enhanced safety check - validate against safe command allowlist (optional strict mode)
  const strictMode = false; // TODO: Add shell strict mode configuration
  if (strictMode) {
    const safetyCheck = validateCommandSafety(command);
    if (!safetyCheck.allowed) {
      return {
        allAllowed: false,
        disallowedCommands: safetyCheck.unsafeCommands || [command],
        blockReason: `${safetyCheck.reason} (Strict mode enabled)`,
        isHardDenial: true,
      };
    }
  }

  const SHELL_TOOL_NAMES = ['run_shell_command', 'ShellTool'];
  const normalize = (cmd: string): string => cmd.trim().replace(/\s+/g, ' ');

  const isPrefixedBy = (cmd: string, prefix: string): boolean => {
    if (!cmd.startsWith(prefix)) {
      return false;
    }
    return cmd.length === prefix.length || cmd[prefix.length] === ' ';
  };

  const extractCommands = (tools: string[]): string[] =>
    tools.flatMap((tool) => {
      for (const toolName of SHELL_TOOL_NAMES) {
        if (tool.startsWith(`${toolName}(`) && tool.endsWith(')')) {
          return [normalize(tool.slice(toolName.length + 1, -1))];
        }
      }
      return [];
    });

  const coreTools = config.getCoreTools() || [];
  const excludeTools = config.getExcludeTools() || [];
  const commandsToValidate = splitCommands(command).map(normalize);

  // 1. Blocklist Check (Highest Priority)
  if (SHELL_TOOL_NAMES.some((name) => excludeTools.includes(name))) {
    return {
      allAllowed: false,
      disallowedCommands: commandsToValidate,
      blockReason: 'Shell tool is globally disabled in configuration',
      isHardDenial: true,
    };
  }
  const blockedCommands = extractCommands(excludeTools);
  for (const cmd of commandsToValidate) {
    if (blockedCommands.some((blocked) => isPrefixedBy(cmd, blocked))) {
      return {
        allAllowed: false,
        disallowedCommands: [cmd],
        blockReason: `Command '${cmd}' is blocked by configuration`,
        isHardDenial: true,
      };
    }
  }

  const globallyAllowedCommands = extractCommands(coreTools);
  const isWildcardAllowed = SHELL_TOOL_NAMES.some((name) =>
    coreTools.includes(name),
  );

  // If there's a global wildcard, all commands are allowed at this point
  // because they have already passed the blocklist check.
  if (isWildcardAllowed) {
    return { allAllowed: true, disallowedCommands: [] };
  }

  if (sessionAllowlist) {
    // "DEFAULT DENY" MODE: A session allowlist is provided.
    // All commands must be in either the session or global allowlist.
    const disallowedCommands: string[] = [];
    for (const cmd of commandsToValidate) {
      const isSessionAllowed = [...sessionAllowlist].some((allowed) =>
        isPrefixedBy(cmd, normalize(allowed)),
      );
      if (isSessionAllowed) continue;

      const isGloballyAllowed = globallyAllowedCommands.some((allowed) =>
        isPrefixedBy(cmd, allowed),
      );
      if (isGloballyAllowed) continue;

      disallowedCommands.push(cmd);
    }

    if (disallowedCommands.length > 0) {
      return {
        allAllowed: false,
        disallowedCommands,
        blockReason: `Command(s) not on the global or session allowlist.`,
        isHardDenial: false, // This is a soft denial; confirmation is possible.
      };
    }
  } else {
    // "DEFAULT ALLOW" MODE: No session allowlist.
    const hasSpecificAllowedCommands = globallyAllowedCommands.length > 0;
    if (hasSpecificAllowedCommands) {
      const disallowedCommands: string[] = [];
      for (const cmd of commandsToValidate) {
        const isGloballyAllowed = globallyAllowedCommands.some((allowed) =>
          isPrefixedBy(cmd, allowed),
        );
        if (!isGloballyAllowed) {
          disallowedCommands.push(cmd);
        }
      }
      if (disallowedCommands.length > 0) {
        return {
          allAllowed: false,
          disallowedCommands,
          blockReason: `Command(s) not in the allowed commands list.`,
          isHardDenial: false, // This is a soft denial.
        };
      }
    }
    // If no specific global allowlist exists, and it passed the blocklist,
    // the command is allowed by default.
  }

  // If all checks for the current mode pass, the command is allowed.
  return { allAllowed: true, disallowedCommands: [] };
}

/**
 * Determines whether a given shell command is allowed to execute based on
 * the tool's configuration including allowlists and blocklists.
 *
 * This function operates in "default allow" mode. It is a wrapper around
 * `checkCommandPermissions`.
 *
 * @param command The shell command string to validate.
 * @param config The application configuration.
 * @returns An object with 'allowed' boolean and optional 'reason' string if not allowed.
 */
export function isCommandAllowed(
  command: string,
  config: Config,
): { allowed: boolean; reason?: string } {
  // By not providing a sessionAllowlist, we invoke "default allow" behavior.
  const { allAllowed, blockReason } = checkCommandPermissions(command, config);
  if (allAllowed) {
    return { allowed: true };
  }
  return { allowed: false, reason: blockReason };
}
