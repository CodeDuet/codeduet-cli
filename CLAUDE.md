# CodeDuet Memory Reference

## Project Overview

CodeDuet is an AI-powered command-line workflow tool for developers, forked from Qwen Code and originally based on Google Gemini CLI. It provides an interactive REPL environment for AI-assisted coding with comprehensive multi-provider support.

### Current Version: 0.1.0
- **Package Name**: `@codeduet-ai/codeduet-cli`
- **Commands**: `codeduet`, `cd-cli`, `codeduet-code`
- **Repository**: https://github.com/CodeDuet/codeduet-cli

## Architecture

### Core Components
- **`packages/cli`**: Frontend CLI interface built with React/Ink
- **`packages/core`**: Backend server handling model APIs and tool management
- **`packages/vscode-ide-companion`**: VS Code integration
- **`packages/test-utils`**: Testing utilities

### Key Technologies
- **Runtime**: Node.js 20+
- **UI Framework**: React with Ink for terminal rendering
- **Build System**: ESBuild + custom bundling scripts
- **Package Management**: npm workspaces
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript

## Multi-Provider Architecture

### Authentication Types (AuthType enum)
```typescript
export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key', 
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  USE_OPENAI = 'openai',
  QWEN_OAUTH = 'qwen-oauth',
  USE_OLLAMA = 'ollama',           // NEW: Local Ollama
  USE_LM_STUDIO = 'lm-studio',     // NEW: Local LM Studio  
  USE_RUNPOD = 'runpod',          // NEW: Remote RunPod GPU
}
```

### Content Generator System
All providers implement the `ContentGenerator` interface:
- **OpenAIContentGenerator**: Handles OpenAI, Ollama, LM Studio, RunPod (OpenAI-compatible)
- **QwenContentGenerator**: Qwen OAuth provider
- **LoggingContentGenerator**: Wrapper for Gemini/Vertex AI providers

### Provider Configuration

#### Local Providers (Free)
**Ollama**:
- Environment Variables: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- Default URL: `http://localhost:11434`
- Default Model: `llama2`
- API Key: Not required (placeholder: `local-model-placeholder`)

**LM Studio**:
- Environment Variables: `LM_STUDIO_BASE_URL`, `LM_STUDIO_MODEL`
- Default URL: `http://localhost:1234`
- Default Model: `local-model`
- API Key: Not required (placeholder: `local-model-placeholder`)

#### Remote Providers (Paid)
**OpenAI**:
- Environment Variables: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`
- API Key: Required

**Anthropic**:
- Environment Variables: `ANTHROPIC_API_KEY`
- API Key: Required

**RunPod**:
- Environment Variables: `RUNPOD_API_KEY`, `RUNPOD_BASE_URL`, `RUNPOD_MODEL`
- API Key: Required
- Use Case: Scalable GPU inference

#### Legacy Providers
**Qwen OAuth**: `QWEN_OAUTH_DYNAMIC_TOKEN` (special handling)
**Gemini**: `GEMINI_API_KEY`
**Vertex AI**: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`

## File Structure & Key Files

### Configuration Files
- **`package.json`**: Main package configuration with bin commands
- **`tsconfig.json`**: TypeScript configuration
- **`eslint.config.js`**: Linting rules
- **`esbuild.config.js`**: Build configuration
- **`.env`**: Environment variables (project-specific)

### Core Source Files
- **`packages/core/src/core/contentGenerator.ts`**: Provider factory and configuration
- **`packages/core/src/core/openaiContentGenerator.ts`**: OpenAI-compatible provider implementation
- **`packages/cli/src/config/auth.ts`**: Authentication validation and helpers
- **`packages/cli/src/gemini.tsx`**: Main CLI entry point
- **`packages/cli/src/ui/components/AsciiArt.ts`**: Terminal banner/logo

### Documentation Files
- **`README.md`**: Main project documentation
- **`PROVIDER_SETUP.md`**: Comprehensive provider setup guide
- **`changes.md`**: Detailed technical changes documentation
- **`CLAUDE.md`**: This memory reference file
- **`CHANGELOG.md`**: Version history
- **`npm_publish_instructions.md`**: Publishing guide

## Recent Major Changes (v0.1.0)

### Rebranding (BREAKING CHANGES)
- **Name Change**: Qwen Code → CodeDuet
- **Package**: `@qwen-code/qwen-code` → `@anthropic-ai/codeduet-code`
- **Commands Removed**: `qwen`, `qwen-cli` (to avoid conflicts with official Qwen CLI)
- **Commands Added**: `codeduet`, `cd-cli`, `codeduet-code`
- **ASCII Art**: Updated terminal banner to show "CODEDUET"
- **Window Titles**: Updated to show "CodeDuet - {workspace}"

### New Provider Support
**Local Model Support**:
- **Ollama Integration**: Complete support for local Ollama inference
- **LM Studio Integration**: GUI-based local model management
- **Zero Cost**: Both providers offer completely free, private inference

**Remote GPU Support**:
- **RunPod Integration**: Scalable cloud GPU inference
- **Pay-per-use**: Cost-effective for demanding workloads

### YOLO Mode Enhancements
- **New Flag**: `--dangerously-skip-permissions` (alias for `--yolo`)
- **Environment Variable**: `QWEN_YOLO=1` (accepts: `1`, `true`, `yes`)
- **Config Setting**: `dangerouslySkipPermissions: true`
- **Safety Rails**: Enhanced warning banners in both interactive and non-interactive modes

### Configuration Improvements
- **URL Validation**: All base URLs validated before use
- **Error Messages**: Provider-specific guidance for setup issues
- **Helper Functions**: Programmatic environment variable setters
- **Backward Compatibility**: All existing providers continue working

## Build & Development

### Build Process
```bash
npm run clean          # Clean previous builds
npm run generate       # Generate git commit info
npm run build         # Build all packages
npm run bundle        # Create distribution bundle
```

### Development Commands
```bash
npm run start         # Development server
npm run debug         # Debug mode with inspector
npm run test          # Run test suites
npm run lint          # Code linting
npm run typecheck     # TypeScript validation
```

### Publishing Process
```bash
npm run prepare       # Pre-publication preparation
npm publish --access public  # Publish to npm registry
```

## Environment Variables Reference

### Provider Configuration
```bash
# Local Providers
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="codellama"
LM_STUDIO_BASE_URL="http://localhost:1234"
LM_STUDIO_MODEL="your-model"

# Cloud Providers  
OPENAI_API_KEY="sk-your-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4"
ANTHROPIC_API_KEY="sk-ant-your-key"

# Remote GPU
RUNPOD_API_KEY="your-runpod-key"
RUNPOD_BASE_URL="https://api-xyz.runpod.io/v1"
RUNPOD_MODEL="llama2-7b-chat"

# Legacy
GEMINI_API_KEY="your-gemini-key"
GOOGLE_API_KEY="your-google-key"
GOOGLE_CLOUD_PROJECT="your-project"
GOOGLE_CLOUD_LOCATION="us-central1"
```

### Feature Flags
```bash
QWEN_YOLO=1                    # Enable YOLO mode
CLI_TITLE="Custom Title"       # Override window title
DEBUG=1                        # Enable debug mode
GEMINI_SANDBOX=docker          # Sandbox configuration
NO_COLOR=1                     # Disable color output
```

## Tool System

### Built-in Tools
- **File Operations**: `read-file`, `write-file`, `edit`, `glob`, `ls`
- **Shell Operations**: `shell`, `bash`
- **Web Operations**: `web-fetch`, `web-search`
- **Memory Operations**: `memory-tool` (for QWEN.md context)
- **Multi-file Operations**: `read-many-files`

### Tool Configuration
- **YOLO Mode**: Automatically approves all tool operations
- **Approval Mode**: Default requires user confirmation
- **Sandboxing**: Optional containerized execution
- **MCP Support**: Model Context Protocol for external tools

## Security & Settings

### Settings Directory
- **Location**: `~/.qwen/` (maintained for backward compatibility)
- **Main File**: `settings.json`
- **Project Settings**: `{project}/.qwen/settings.json`

### Security Features
- **API Key Protection**: Secure storage and handling
- **Sandbox Execution**: Optional containerized tool execution
- **Permission Prompts**: User approval required (unless YOLO mode)
- **Local Inference**: Complete privacy with Ollama/LM Studio

### Key Settings
```json
{
  "sessionTokenLimit": 32000,
  "dangerouslySkipPermissions": false,
  "selectedAuthType": "ollama",
  "theme": "default",
  "hideBanner": false,
  "showMemoryUsage": false
}
```

## Testing & Quality

### Test Structure
- **Integration Tests**: `integration-tests/`
- **Unit Tests**: `*.test.ts` files alongside source
- **Test Utilities**: `packages/test-utils/`

### Quality Tools
- **ESLint**: Code quality and consistency
- **TypeScript**: Type safety
- **Prettier**: Code formatting
- **Vitest**: Testing framework

## Common Usage Patterns

### Development Workflow
1. **Start CodeDuet**: `codeduet` (auto-detects providers)
2. **Code Analysis**: "Analyze this codebase structure"
3. **Code Generation**: "Create a React component for user profiles"
4. **Refactoring**: "Help me refactor this function for better performance"
5. **Documentation**: "Generate JSDoc comments for this module"

### Provider Selection Strategy
- **Local Development**: Use Ollama/LM Studio for cost-free iteration
- **Complex Tasks**: Use OpenAI GPT-4 or Anthropic Claude for advanced reasoning
- **Large Scale**: Use RunPod for processing intensive workloads
- **Privacy Sensitive**: Use local providers exclusively

### Configuration Best Practices
- **Environment Files**: Use `.env` files for project-specific settings
- **API Key Security**: Store keys in secure environment variables
- **Provider Fallbacks**: Configure multiple providers for redundancy
- **Cost Optimization**: Start local, scale to cloud as needed

## Troubleshooting Reference

### Common Issues
1. **Provider Connection**: Check base URLs and network connectivity
2. **API Key Issues**: Verify key format and permissions
3. **Local Model Issues**: Ensure Ollama/LM Studio services are running
4. **Build Issues**: Clear node_modules and rebuild

### Debug Commands
```bash
# Check provider connectivity
curl http://localhost:11434/api/tags  # Ollama
curl http://localhost:1234/v1/models  # LM Studio

# Environment debugging
env | grep -E "(OLLAMA|LM_STUDIO|OPENAI|RUNPOD)"

# Service status
ollama list                           # Ollama models
ps aux | grep ollama                  # Ollama process
```

## Migration Notes

### From Qwen Code
- **No Breaking Changes**: Existing configurations continue working
- **New Commands**: Replace `qwen` with `codeduet`
- **Enhanced Features**: New providers and YOLO mode improvements
- **Settings**: Existing `.qwen/` settings directory preserved

### Future Considerations
- **Provider Plugins**: Framework for community providers
- **Model Registry**: Shared model configurations
- **Performance Monitoring**: Real-time provider metrics
- **Load Balancing**: Multi-provider request distribution

This memory reference should be updated when significant changes are made to the codebase, particularly when adding new providers, changing authentication methods, or modifying core architecture.