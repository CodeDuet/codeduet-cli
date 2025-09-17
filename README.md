# CodeDuet

<div align="center">

![CodeDuet Screenshot](https://raw.githubusercontent.com/CodeDuet/codeduet-cli/main/docs/assets/codeduet-screenshot.png)

[![npm version](https://img.shields.io/npm/v/@codeduet-cli/codeduet-cli.svg)](https://www.npmjs.com/package/@codeduet-cli/codeduet-cli)
[![License](https://img.shields.io/github/license/ksapp/codeduet-cli.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/@codeduet-cli/codeduet-cli.svg)](https://www.npmjs.com/package/@codeduet-cli/codeduet-cli)

**AI-powered command-line workflow tool for developers**

[Installation](#installation) • [Quick Start](#quick-start) • [Features](#key-features) • [Provider Setup](./PROVIDER_SETUP.md) • [What's New](./changes.md) • [Documentation](./docs/) • [Contributing](./CONTRIBUTING.md)

</div>


CodeDuet is a powerful command-line AI workflow tool forked from [**Qwen Code**](https://github.com/QwenLM/qwen-code), which was adapted from [**Gemini CLI**](https://github.com/google-gemini/gemini-cli). It enhances your development workflow with advanced code understanding, automated tasks, and intelligent assistance, supporting multiple AI providers and models.

## 💡 Free Options Available

Get started with CodeDuet at no cost using any of these free options:

### 🔥 Multiple Provider Support (In Order of Preference)

- **🚀 RunPod**: Scalable remote GPU inference for high-performance models
- **🏠 Ollama**: Run models locally (completely free and private) 
- **🏠 LM Studio**: Local model inference with intuitive GUI
- **🤖 OpenAI**: GPT models with your OpenAI API key
- **🧠 Anthropic Claude**: Advanced reasoning with Claude models
- **⚡ xAI Grok**: X.ai's powerful reasoning models with real-time knowledge
- **🔍 Google Gemini**: Google's latest AI models
- **🔧 Qwen OAuth**: Legacy Qwen model access
- Simply run `codeduet` or `cd-cli` and choose your preferred provider from the menu

### 🌏 Free Tier Options

- **OpenRouter**: Provides free tier access to multiple models
- **Together AI**: Offers free credits for new users
- **Local Models**: Run models locally with Ollama, LM Studio, etc.
- **Anthropic/OpenAI**: Use free credits if available

For detailed setup instructions, see [Authorization](#authorization).

> [!WARNING]  
> **Token Usage Notice**: CodeDuet may issue multiple API calls per cycle, resulting in higher token usage (similar to other AI coding tools). We're actively optimizing API efficiency.

## Key Features

- **Multi-Provider Support** - Works with OpenAI, Anthropic, Ollama, LM Studio, RunPod, and many other providers
- **Local Model Support** - Run models privately on your machine with Ollama or LM Studio
- **Remote GPU Access** - Scale with cloud GPU providers like RunPod
- **Provider-Specific Memory Files** - CLAUDE.md, GEMINI.md, CHATGPT.md, GROK.md, QWEN.md for customized AI interactions
- **Code Understanding & Editing** - Query and edit large codebases beyond traditional context window limits
- **Workflow Automation** - Automate operational tasks like handling pull requests and complex rebases
- **YOLO Mode** - Skip permission prompts for rapid development (use with caution)

## Installation

### Prerequisites

Ensure you have [Node.js version 20](https://nodejs.org/en/download) or higher installed.

```bash
curl -qL https://www.npmjs.com/install.sh | sh
```

### Install from npm

```bash
npm install -g @codeduet-cli/codeduet-cli@latest
codeduet --version
```

**macOS Permission Fix (if needed):**
```bash
# If you get permission errors, use sudo:
sudo npm install -g @codeduet-cli/codeduet-cli@latest

# Or configure npm for user-level installs:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g @codeduet-cli/codeduet-cli@latest
```

### Install from source

```bash
git clone https://github.com/CodeDuet/codeduet-cli.git
cd codeduet-cli
npm install

# Install globally (may require sudo on macOS)
npm install -g .
# or with sudo if needed:
sudo npm install -g .
```

### Verify Installation

After installation, test that all commands work:

```bash
codeduet --version
cd-cli --version
codeduet-code --version
```

## Quick Start

```bash
# Start CodeDuet (multiple ways to launch)
codeduet
# or
cd-cli
# or
codeduet-code

# Example commands
> Explain this codebase structure
> Help me refactor this function
> Generate unit tests for this module
```

### Session Management

Control your token usage with configurable session limits to optimize costs and performance.

#### Configure Session Token Limit

Create or edit `.qwen/settings.json` in your home directory:

```json
{
  "sessionTokenLimit": 32000
}
```

> **Note**: The `.qwen` directory name is maintained for backwards compatibility.

#### Memory Files

CodeDuet supports provider-specific memory files to customize AI interactions:

**Supported Memory Files:**
- **CLAUDE.md** - Custom instructions for Anthropic Claude interactions
- **GEMINI.md** - Custom instructions for Google Gemini interactions  
- **CHATGPT.md** - Custom instructions for OpenAI ChatGPT interactions
- **GROK.md** - Custom instructions for xAI Grok interactions
- **QWEN.md** - Custom instructions for Qwen models

**File Locations:**
```bash
# Project-specific (highest priority)
./CLAUDE.md
./GEMINI.md  
./CHATGPT.md
./GROK.md
./QWEN.md

# Global (shared across projects)
~/.qwen/CLAUDE.md
~/.qwen/GEMINI.md
~/.qwen/CHATGPT.md
~/.qwen/GROK.md
~/.qwen/QWEN.md
```

**Example Memory File Content:**
```markdown
# My Coding Preferences

## Code Style
- Use TypeScript for all new JavaScript projects
- Prefer functional programming patterns
- Use const/let instead of var
- Always include error handling

## Project Context  
- This is a React application using Next.js
- We use Tailwind CSS for styling
- Database: PostgreSQL with Prisma ORM

## Personal Preferences
- Explain complex code with comments
- Write comprehensive unit tests
- Follow clean architecture principles
```

**Usage:**
- Create memory files using the `/memory` command or save_memory tool
- Files are automatically discovered and loaded during conversations  
- Project-level files take priority over global files
- Multiple memory files can be active simultaneously

#### Session Commands

- **`/compress`** - Compress conversation history to continue within token limits
- **`/clear`** - Clear all conversation history and start fresh
- **`/stats`** - Check current token usage and limits

> 📝 **Note**: Session token limit applies to a single conversation, not cumulative API calls.

### Authorization

CodeDuet supports multiple AI providers. Choose your preferred method:

#### 1. OpenAI (🚀 Recommended)

Use your OpenAI API key for access to GPT models:

```bash
# Just run this command and configure when prompted
codeduet
```

**Setup:**
1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Run `codeduet` and follow the setup prompts
3. Or set environment variables (see below)

#### 2. Anthropic Claude

Use your Anthropic API key for Claude models:

```bash
export ANTHROPIC_API_KEY="your_api_key_here"
export ANTHROPIC_MODEL="claude-3-sonnet-20240229"  # optional, this is the default
codeduet
```

#### 3. Local Models (Ollama)

Run models locally with Ollama:

```bash
# Install Ollama (visit https://ollama.ai for installation)
ollama pull llama2  # or any other model

# Set environment variables (optional, defaults provided)
export OLLAMA_BASE_URL="http://localhost:11434"  # default
export OLLAMA_MODEL="llama2"  # or your preferred model

codeduet
```

#### 4. Local Models (LM Studio)

Use LM Studio for local inference:

```bash
# Start LM Studio and load a model
# Enable the local server in LM Studio settings

# Set environment variables (optional, defaults provided)
export LM_STUDIO_BASE_URL="http://localhost:1234"  # default
export LM_STUDIO_MODEL="local-model"  # your loaded model

codeduet
```

#### 5. Remote GPU (RunPod)

Use RunPod for scalable GPU inference:

```bash
# Get your RunPod API key and endpoint URL
export RUNPOD_API_KEY="your_runpod_api_key"
export RUNPOD_BASE_URL="https://api-xxxxxxxxx.runpod.io/v1"  # your endpoint
export RUNPOD_MODEL="your_model_name"

codeduet
```

#### 6. xAI Grok

Use your xAI API key for Grok models:

```bash
export GROK_API_KEY="your_xai_api_key_here"  # or use XAI_API_KEY
export GROK_MODEL="grok-beta"  # optional, this is the default
export GROK_BASE_URL="https://api.x.ai/v1"  # optional, this is the default
codeduet
```

Get your API key from [xAI Console](https://console.x.ai/).

#### 7. Google Gemini

Use your Google Gemini API key:

```bash
export GEMINI_API_KEY="your_api_key_here"
codeduet
```

#### 8. OpenAI-Compatible API

Use API keys for OpenAI or other compatible providers:

**Configuration Methods:**

1. **Environment Variables**

   ```bash
   export OPENAI_API_KEY="your_api_key_here"
   export OPENAI_BASE_URL="your_api_endpoint"
   export OPENAI_MODEL="your_model_choice"
   ```

2. **Project `.env` File**
   Create a `.env` file in your project root:
   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_BASE_URL=your_api_endpoint
   OPENAI_MODEL=your_model_choice
   ```

**API Provider Options**

> ⚠️ **Regional Notice:**
>
> - **Mainland China**: Use Alibaba Cloud Bailian or ModelScope
> - **International**: Use Alibaba Cloud ModelStudio or OpenRouter

<details>
<summary><b>🇨🇳 For Users in Mainland China</b></summary>

**Option 1: Alibaba Cloud Bailian** ([Apply for API Key](https://bailian.console.aliyun.com/))

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="gpt-4"
```

**Option 2: ModelScope (Free Tier)** ([Apply for API Key](https://modelscope.cn/docs/model-service/API-Inference/intro))

- ✅ **2,000 free API calls per day**
- ⚠️ Connect your Aliyun account to avoid authentication errors

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://api-inference.modelscope.cn/v1"
export OPENAI_MODEL="Qwen/Qwen3-Coder-480B-A35B-Instruct"
```

</details>

<details>
<summary><b>🌍 For International Users</b></summary>

**Option 1: Alibaba Cloud ModelStudio** ([Apply for API Key](https://modelstudio.console.alibabacloud.com/))

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="gpt-4"
```

**Option 2: OpenRouter (Free Tier Available)** ([Apply for API Key](https://openrouter.ai/))

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
export OPENAI_MODEL="openai/gpt-3.5-turbo"
```

</details>

## Usage Examples

### 🔍 Explore Codebases

```bash
cd your-project/
codeduet

# Architecture analysis
> Describe the main pieces of this system's architecture
> What are the key dependencies and how do they interact?
> Find all API endpoints and their authentication methods
```

### 💻 Code Development

```bash
# Refactoring
> Refactor this function to improve readability and performance
> Convert this class to use dependency injection
> Split this large module into smaller, focused components

# Code generation
> Create a REST API endpoint for user management
> Generate unit tests for the authentication module
> Add error handling to all database operations
```

### 🔄 Automate Workflows

```bash
# Git automation
> Analyze git commits from the last 7 days, grouped by feature
> Create a changelog from recent commits
> Find all TODO comments and create GitHub issues

# File operations
> Convert all images in this directory to PNG format
> Rename all test files to follow the *.test.ts pattern
> Find and remove all console.log statements
```

### 🐛 Debugging & Analysis

```bash
# Performance analysis
> Identify performance bottlenecks in this React component
> Find all N+1 query problems in the codebase

# Security audit
> Check for potential SQL injection vulnerabilities
> Find all hardcoded credentials or API keys
```

## Popular Tasks

### 📚 Understand New Codebases

```text
> What are the core business logic components?
> What security mechanisms are in place?
> How does the data flow through the system?
> What are the main design patterns used?
> Generate a dependency graph for this module
```

### 🔨 Code Refactoring & Optimization

```text
> What parts of this module can be optimized?
> Help me refactor this class to follow SOLID principles
> Add proper error handling and logging
> Convert callbacks to async/await pattern
> Implement caching for expensive operations
```

### 📝 Documentation & Testing

```text
> Generate comprehensive JSDoc comments for all public APIs
> Write unit tests with edge cases for this component
> Create API documentation in OpenAPI format
> Add inline comments explaining complex algorithms
> Generate a README for this module
```

### 🧠 Memory & Personalization

```text
> Remember that I prefer TypeScript for new projects
> Save this: I use Tailwind CSS for styling
> Create a CLAUDE.md file with my coding preferences  
> Update my memory with the new API endpoint structure
> Remember that this project uses PostgreSQL with Prisma
```

### 🚀 Development Acceleration

```text
> Set up a new Express server with authentication
> Create a React component with TypeScript and tests
> Implement a rate limiter middleware
> Add database migrations for new schema
> Configure CI/CD pipeline for this project
```

## Commands & Shortcuts

### Session Commands

- `/help` - Display available commands
- `/clear` - Clear conversation history
- `/compress` - Compress history to save tokens
- `/stats` - Show current session information
- `/exit` or `/quit` - Exit CodeDuet

### Keyboard Shortcuts

- `Ctrl+C` - Cancel current operation
- `Ctrl+D` - Exit (on empty line)
- `Up/Down` - Navigate command history

## Benchmark Results

### Terminal-Bench Performance

| Agent     | Model              | Accuracy |
| --------- | ------------------ | -------- |
| CodeDuet  | GPT-4              | TBD      |
| CodeDuet  | Claude-3.5-Sonnet  | TBD      |

## Development & Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) to learn how to contribute to the project.

For detailed authentication setup, see the [authentication guide](./docs/cli/authentication.md).

## Troubleshooting

### Common Installation Issues

**Permission Errors (macOS/Linux)**
```bash
# Error: EACCES permission denied
# Solution 1: Use sudo
sudo npm install -g @codeduet-cli/codeduet-cli@latest

# Solution 2: Configure npm for user installs (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g @codeduet-cli/codeduet-cli@latest
```

**Command Not Found**
```bash
# Verify installation
which codeduet
npm list -g @codeduet-cli/codeduet-cli

# If missing, check PATH or reinstall
echo $PATH
npm install -g @codeduet-cli/codeduet-cli@latest
```

**Node Version Warnings**
```bash
# EBADENGINE warnings are usually safe to ignore
# But you can upgrade Node.js if desired:
# Visit https://nodejs.org for latest LTS version
```

**Build Errors**
```bash
# Clean and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

For more detailed troubleshooting, check the [troubleshooting guide](docs/troubleshooting.md).

## Acknowledgments

This project is forked from [Qwen Code](https://github.com/QwenLM/qwen-code), which is based on [Google Gemini CLI](https://github.com/google-gemini/gemini-cli). We acknowledge and appreciate the excellent work of both the Qwen Code and Gemini CLI teams. CodeDuet focuses on multi-provider support and enhanced developer workflow features.

## License

[LICENSE](./LICENSE)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=codeduet/codeduet-cli&type=Date)](https://www.star-history.com/#codeduet/codeduet-cli&Date)
