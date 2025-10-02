# CodeDuet Memory Reference

## Project Overview
CodeDuet is an AI-powered CLI for developers. Commands: `codeduet`, `cd-cli`, `codeduet-code`. Package: `@codeduet-ai/codeduet-cli` v0.1.0.

## Architecture
- **`packages/cli`**: React/Ink frontend
- **`packages/core`**: Model APIs and tools  
- **Tech Stack**: Node.js 20+, React/Ink, ESBuild, npm workspaces, Vitest, ESLint

## Change Management Rules

**MANDATORY**: When making ANY changes to the codebase:

1. **Always update CHANGES.md**:
   - Add entry with date, change type, and description
   - Include affected files/components
   - Note any breaking changes or migration steps

2. **Update documentation**:
   - Modify relevant docs/ files for new features
   - Update API documentation for endpoint changes
   - Update config examples for new parameters
   - Update README.md if setup/usage changes

3. **Unit testing requirement**:
   - All changes MUST pass unit tests before implementation is considered complete
   - Run `pytest tests/unit/` to verify all unit tests pass
   - If unit tests fail and issues cannot be fixed, changes must be rolled back
   - New functionality requires corresponding unit tests
   - **NEVER use static mock data in production code for testing purposes**
     - Mock data should only exist in test files (tests/ directory)
     - Production code must not contain hardcoded test responses or fake data
     - Use proper mocking frameworks (unittest.mock, pytest-mock) in tests only
     - All API responses must come from real business logic, not embedded test data

4. **Change tracking format**:
   ```
   ## [YYYY-MM-DD] - Change Type
   ### Changed/Added/Fixed/Removed
   - Description of change (files: path/to/file.py)
   - Breaking change note if applicable
   ```

## Providers
**Local (Free)**: Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`), LM Studio (`LM_STUDIO_BASE_URL`, `LM_STUDIO_MODEL`)
**Remote**: OpenAI (`OPENAI_API_KEY`), Anthropic (`ANTHROPIC_API_KEY`), RunPod (`RUNPOD_API_KEY`, `RUNPOD_BASE_URL`)
**Legacy**: Gemini (`GEMINI_API_KEY`), Vertex AI (`GOOGLE_CLOUD_PROJECT`), Qwen OAuth (`QWEN_OAUTH_DYNAMIC_TOKEN`)

## Key Files
**Core**: `packages/core/src/core/contentGenerator.ts`, `packages/cli/src/gemini.tsx` (main entry)
**Config**: `package.json`, `tsconfig.json`, `eslint.config.js`, `.env`
**Docs**: `README.md`, `PROVIDER_SETUP.md`, `changes.md`, `CLAUDE.md`

## v0.1.0 Changes
**Rebranding**: Qwen Code → CodeDuet (commands: `codeduet`, `cd-cli`, `codeduet-code`)
**New Providers**: Ollama (local), LM Studio (local), RunPod (remote GPU)
**YOLO Mode**: `--dangerously-skip-permissions`, `QWEN_YOLO=1` env var

## Build Commands
**Build**: `npm run clean && npm run generate && npm run build && npm run bundle`
**Dev**: `npm run start` (dev server), `npm run test`, `npm run lint`, `npm run typecheck`
**Publish**: `npm run prepare && npm publish --access public`

## Environment Variables
**YOLO Mode**: `QWEN_YOLO=1`, **Debug**: `DEBUG=1`, **No Color**: `NO_COLOR=1`
**Settings**: `~/.qwen/settings.json` (backward compatibility)

## Tools & Testing
**Built-in Tools**: File ops (`read-file`, `write-file`, `edit`), shell (`bash`), web (`web-fetch`)
**Testing**: Vitest framework, `integration-tests/`, `*.test.ts` files
**Quality**: ESLint, TypeScript, Prettier

## Troubleshooting
**Provider Issues**: Check URLs, API keys, service status
**Debug**: `curl http://localhost:11434/api/tags` (Ollama), `ollama list`, `env | grep OLLAMA`
**Build Issues**: Clear `node_modules`, rebuild