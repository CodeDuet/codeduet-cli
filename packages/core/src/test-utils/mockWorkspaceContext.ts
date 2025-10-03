/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi } from 'vitest';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import * as fs from 'fs';

/**
 * Creates a mock WorkspaceContext for testing
 * @param rootDir The root directory to use for the mock
 * @param additionalDirs Optional additional directories to include in the workspace
 * @returns A mock WorkspaceContext instance
 */
export function createMockWorkspaceContext(
  rootDir: string,
  additionalDirs: string[] = [],
): WorkspaceContext {
  // Resolve symlinks in directories for consistent path comparison
  const resolvedRootDir = fs.existsSync(rootDir) ? fs.realpathSync(rootDir) : rootDir;
  const resolvedAdditionalDirs = additionalDirs.map(dir => 
    fs.existsSync(dir) ? fs.realpathSync(dir) : dir
  );
  const allDirs = [resolvedRootDir, ...resolvedAdditionalDirs];

  const mockWorkspaceContext = {
    addDirectory: vi.fn(),
    getDirectories: vi.fn().mockReturnValue(allDirs),
    isPathWithinWorkspace: vi
      .fn()
      .mockImplementation((path: string) => {
        // Resolve the input path if it exists
        const resolvedPath = fs.existsSync(path) ? fs.realpathSync(path) : path;
        return allDirs.some((dir) => 
          resolvedPath.startsWith(dir + require('path').sep) || resolvedPath === dir
        );
      }),
  } as unknown as WorkspaceContext;

  return mockWorkspaceContext;
}
