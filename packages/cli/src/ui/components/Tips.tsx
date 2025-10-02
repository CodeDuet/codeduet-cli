/**
 * @license
 * Copyright 2025 CodeDuet
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { type Config } from '@qwen-code/qwen-code-core';

interface TipsProps {
  config: Config;
}

export const Tips: React.FC<TipsProps> = ({ config }) => {
  const geminiMdFileCount = config.getGeminiMdFileCount();
  return (
    <Box flexDirection="column">
      <Text color={Colors.Foreground}>Tips for getting started:</Text>
      <Text color={Colors.Foreground}>
        1. Ask questions, edit files, or run commands.
      </Text>
      <Text color={Colors.Foreground}>
        2. Be specific for the best results.
      </Text>
      {geminiMdFileCount === 0 && (
        <Text color={Colors.Foreground}>
          3. Create{' '}
          <Text bold color={Colors.AccentPurple}>
            CLAUDE.md
          </Text>
          , {' '}
          <Text bold color={Colors.AccentPurple}>
            GEMINI.md
          </Text>
          , {' '}
          <Text bold color={Colors.AccentPurple}>
            CHATGPT.md
          </Text>
          , {' '}
          <Text bold color={Colors.AccentPurple}>
            GROK.md
          </Text>
          , or {' '}
          <Text bold color={Colors.AccentPurple}>
            QWEN.md
          </Text>{' '}
          files to customize your interactions with CodeDuet.
        </Text>
      )}
      <Text color={Colors.Foreground}>
        {geminiMdFileCount === 0 ? '4.' : '3.'}{' '}
        <Text bold color={Colors.AccentPurple}>
          /help
        </Text>{' '}
        for more information.
      </Text>
    </Box>
  );
};
