# Authentication Setup

CodeDuet supports multiple authentication methods to access AI models, including local model providers and cloud services. Choose the method that best fits your use case:

## 🚀 Quick Provider Overview

| Provider | Cost | Privacy | Setup Complexity | Performance |
|----------|------|---------|------------------|-------------|
| Ollama | Free | Complete | Low | Good* |
| LM Studio | Free | Complete | Low | Good* |
| OpenAI | Pay-per-use | External | Low | Excellent |
| Anthropic | Pay-per-use | External | Low | Excellent |
| RunPod | GPU-on-demand | External | Medium | Excellent |

*Performance depends on your hardware

For detailed setup instructions, see our [Provider Setup Guide](../../PROVIDER_SETUP.md).

## Authentication Methods

### 1. 🆓 Local Model Providers (Recommended for Privacy)

#### Ollama (Completely Free)
Run models locally on your machine with zero API costs:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull codellama

# Configure (optional - defaults work)
export OLLAMA_BASE_URL="http://localhost:11434"  # default
export OLLAMA_MODEL="codellama"

# Start CodeDuet
codeduet
```

#### LM Studio (User-Friendly GUI)
Easy local model management with a graphical interface:

```bash
# 1. Download LM Studio from https://lmstudio.ai
# 2. Install and load a model through the GUI
# 3. Start the local server in LM Studio

# Configure (optional - defaults work)
export LM_STUDIO_BASE_URL="http://localhost:1234"  # default
export LM_STUDIO_MODEL="your-loaded-model"

# Start CodeDuet
codeduet
```

### 2. ☁️ Cloud Providers

#### OpenAI (GPT Models)
Access to GPT-4 and other OpenAI models:

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
export OPENAI_MODEL="gpt-4"  # or gpt-3.5-turbo
codeduet
```

#### Anthropic Claude
Access to Claude models:

```bash
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"
codeduet
```

#### RunPod (Remote GPU)
Scalable GPU inference for demanding workloads:

```bash
export RUNPOD_API_KEY="your-runpod-api-key"
export RUNPOD_BASE_URL="https://api-xxxxxxxxx.runpod.io/v1"
export RUNPOD_MODEL="your-model-name"
codeduet
```

### 3. Legacy Methods

#### Qwen OAuth (Legacy)
Legacy authentication method from the original Qwen Code:

- Use this option to log in with your qwen.ai account.
- During initial startup, CodeDuet will direct you to the qwen.ai authentication page. Once authenticated, your credentials will be cached locally so the web login can be skipped on subsequent runs.
    - **Requirements:**
      - Valid qwen.ai account
      - Internet connection for initial authentication
    - **Benefits:**
      - Seamless access to Qwen models
      - Automatic credential refresh
      - No manual API key management required

    **Getting Started:**

    ```bash
    # Start Qwen Code and follow the OAuth flow
    qwen
    ```

    The CLI will automatically open your browser and guide you through the authentication process.

    **For users who authenticate using their qwen.ai account:**

    **Quota:**
    - 60 requests per minute
    - 2,000 requests per day
    - Token usage is not applicable

    **Cost:** Free

    **Notes:** A specific quota for different models is not specified; model fallback may occur to preserve shared experience quality.

2.  **<a id="openai-api"></a>OpenAI-Compatible API:**
    - Use API keys for OpenAI or other compatible providers.
    - This method allows you to use various AI models through API keys.

    **Configuration Methods:**

    a) **Environment Variables:**

    ```bash
    export OPENAI_API_KEY="your_api_key_here"
    export OPENAI_BASE_URL="your_api_endpoint"  # Optional
    export OPENAI_MODEL="your_model_choice"     # Optional
    ```

    b) **Project `.env` File:**
    Create a `.env` file in your project root:

    ```env
    OPENAI_API_KEY=your_api_key_here
    OPENAI_BASE_URL=your_api_endpoint
    OPENAI_MODEL=your_model_choice
    ```

    **Supported Providers:**
    - OpenAI (https://platform.openai.com/api-keys)
    - Alibaba Cloud Bailian
    - ModelScope
    - OpenRouter
    - Azure OpenAI
    - Any OpenAI-compatible API

## Switching Authentication Methods

To switch between authentication methods during a session, use the `/auth` command in the CLI interface:

```bash
# Within the CLI, type:
/auth
```

This will allow you to reconfigure your authentication method without restarting the application.

### Persisting Environment Variables with `.env` Files

You can create a **`.qwen/.env`** file in your project directory or in your home directory. Creating a plain **`.env`** file also works, but `.qwen/.env` is recommended to keep Qwen Code variables isolated from other tools.

**Important:** Some environment variables (like `DEBUG` and `DEBUG_MODE`) are automatically excluded from project `.env` files to prevent interference with qwen-code behavior. Use `.qwen/.env` files for qwen-code specific variables.

Qwen Code automatically loads environment variables from the **first** `.env` file it finds, using the following search order:

1. Starting in the **current directory** and moving upward toward `/`, for each directory it checks:
   1. `.qwen/.env`
   2. `.env`
2. If no file is found, it falls back to your **home directory**:
   - `~/.qwen/.env`
   - `~/.env`

> **Important:** The search stops at the **first** file encountered—variables are **not merged** across multiple files.

#### Examples

**Project-specific overrides** (take precedence when you are inside the project):

```bash
mkdir -p .qwen
cat >> .qwen/.env <<'EOF'
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="https://api-inference.modelscope.cn/v1"
OPENAI_MODEL="Qwen/Qwen3-Coder-480B-A35B-Instruct"
EOF
```

**User-wide settings** (available in every directory):

```bash
mkdir -p ~/.qwen
cat >> ~/.qwen/.env <<'EOF'
OPENAI_API_KEY="your-api-key"
OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
OPENAI_MODEL="qwen3-coder-plus"
EOF
```

## Non-Interactive Mode / Headless Environments

When running Qwen Code in a non-interactive environment, you cannot use the OAuth login flow.
Instead, you must configure authentication using environment variables.

The CLI will automatically detect if it is running in a non-interactive terminal and will use the
OpenAI-compatible API method if configured:

1.  **OpenAI-Compatible API:**
    - Set the `OPENAI_API_KEY` environment variable.
    - Optionally set `OPENAI_BASE_URL` and `OPENAI_MODEL` for custom endpoints.
    - The CLI will use these credentials to authenticate with the API provider.

**Example for headless environments:**

```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api-inference.modelscope.cn/v1"
export OPENAI_MODEL="Qwen/Qwen3-Coder-480B-A35B-Instruct"

# Run Qwen Code
qwen
```

If no API key is set in a non-interactive session, the CLI will exit with an error prompting you to configure authentication.
