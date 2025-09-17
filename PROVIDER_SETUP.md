# Provider Setup Guide

CodeDuet supports multiple AI providers for maximum flexibility. Choose the option that best fits your needs:

## 🆓 Free & Local Options

### Ollama (Completely Free)
Run models locally on your machine with no API costs.

**Installation:**
```bash
# Install Ollama (visit https://ollama.ai)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2        # 7B model, good for most tasks
ollama pull codellama     # Optimized for coding
ollama pull mistral       # Alternative option
```

**Configuration:**
```bash
# Optional - customize settings (defaults work out of the box)
export OLLAMA_BASE_URL="http://localhost:11434"
export OLLAMA_MODEL="llama2"

# Start CodeDuet
codeduet
```

### LM Studio (Completely Free)
Easy-to-use GUI for running local models.

**Installation:**
1. Download LM Studio from https://lmstudio.ai
2. Install and launch the application
3. Browse and download a model (e.g., Code Llama, Mistral)
4. Start the local server (click "Start Server" in LM Studio)

**Configuration:**
```bash
# Optional - customize settings
export LM_STUDIO_BASE_URL="http://localhost:1234"
export LM_STUDIO_MODEL="your-loaded-model-name"

# Start CodeDuet
codeduet
```

## ☁️ Cloud Providers

### Anthropic Claude (API Key Required)
Access Claude's advanced reasoning capabilities.

**Setup:**
1. Get your API key from [Anthropic Console](https://console.anthropic.com)
2. Configure environment variables:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
export ANTHROPIC_MODEL="claude-3-sonnet-20240229"  # Default, can be customized
export ANTHROPIC_BASE_URL="https://api.anthropic.com"  # Default, usually not needed

# Start CodeDuet
codeduet
```

**Available Models:**
- `claude-3-sonnet-20240229` - Balanced performance (recommended)
- `claude-3-haiku-20240307` - Fastest, most economical
- `claude-3-opus-20240229` - Most capable, highest cost

**Features:**
- Advanced reasoning and analysis
- Long context windows (up to 200k tokens)
- Code understanding and generation
- Safety-focused responses

## ☁️ Other Cloud Providers

### OpenAI (Pay-per-use)
Access to GPT models including GPT-4.

**Setup:**
1. Get API key from https://platform.openai.com/api-keys
2. Configure:

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
export OPENAI_MODEL="gpt-4"  # or gpt-3.5-turbo

codeduet
```

### Anthropic Claude (Pay-per-use)
Access to Claude models.

**Setup:**
1. Get API key from https://console.anthropic.com
2. Configure:

```bash
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

codeduet
```

### RunPod (GPU-on-demand)
Scalable GPU inference for larger models.

**Setup:**
1. Create account at https://runpod.io
2. Deploy a serverless endpoint with an OpenAI-compatible model
3. Get your endpoint URL and API key
4. Configure:

```bash
export RUNPOD_API_KEY="your-runpod-api-key"
export RUNPOD_BASE_URL="https://api-xxxxxxxxx.runpod.io/v1"
export RUNPOD_MODEL="your-model-name"

codeduet
```

## 🔧 Advanced Configuration

### Using .env Files
Create a `.env` file in your project directory:

```env
# For Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=codellama

# For LM Studio  
LM_STUDIO_BASE_URL=http://localhost:1234
LM_STUDIO_MODEL=CodeLlama-7B-Instruct

# For OpenAI
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4

# For Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here

# For RunPod
RUNPOD_API_KEY=your-runpod-key
RUNPOD_BASE_URL=https://api-xxxxxxxxx.runpod.io/v1
RUNPOD_MODEL=llama2-7b-chat
```

### Multiple Provider Setup
You can configure multiple providers and switch between them:

```bash
# Setup multiple providers
export OLLAMA_MODEL="codellama"
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# CodeDuet will prompt you to choose or use the first available
codeduet
```

## 📊 Provider Comparison

| Provider | Cost | Privacy | Speed | Model Selection |
|----------|------|---------|-------|-----------------|
| Ollama | Free | Complete | Fast* | Good |
| LM Studio | Free | Complete | Fast* | Good |
| OpenAI | Pay-per-use | External | Fast | Excellent |
| Anthropic | Pay-per-use | External | Fast | Good |
| RunPod | GPU-on-demand | External | Very Fast | Excellent |

*Speed depends on your hardware

## 🚀 Recommended Setups

### For Learning/Experimentation
- **Ollama** with `codellama` or `mistral`
- No costs, complete privacy, decent performance

### For Professional Development
- **OpenAI GPT-4** or **Anthropic Claude**
- Best reasoning capabilities, latest features

### For Teams/Enterprise
- **LM Studio** for privacy-sensitive work
- **RunPod** for scalable processing
- **OpenAI/Anthropic** for production workflows

### For Cost-Conscious Users
1. Start with **Ollama** for most tasks
2. Use **OpenAI GPT-3.5** for complex reasoning
3. Switch to **GPT-4** only when needed

## 🛠️ Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
ollama list

# Restart Ollama service
ollama serve

# Check connectivity
curl http://localhost:11434/api/tags
```

### LM Studio Issues
1. Ensure the local server is started in LM Studio
2. Check the server logs in LM Studio
3. Verify the model is loaded and ready

### Connection Issues
```bash
# Test connectivity
curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"llama2","prompt":"Hello"}'

# For LM Studio
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"local-model","messages":[{"role":"user","content":"Hello"}]}'
```

### Environment Variable Issues
```bash
# Check current environment
env | grep -E "(OLLAMA|LM_STUDIO|OPENAI|ANTHROPIC|RUNPOD)"

# Clear and reset if needed
unset OLLAMA_BASE_URL OLLAMA_MODEL
export OLLAMA_MODEL="codellama"
```

## 🔐 Security Best Practices

### For Local Providers
- Keep Ollama/LM Studio updated
- Use firewall rules to restrict access if needed
- Models are stored locally - ensure disk encryption

### For Cloud Providers
- Never commit API keys to version control
- Use environment variables or secure key management
- Rotate API keys regularly
- Monitor usage and set billing limits

### General
- Use `.env` files for project-specific configuration
- Keep API keys in secure password managers
- Be mindful of data sensitivity when choosing providers

## 📚 Model Recommendations

### Code-Focused Models
- **Ollama**: `codellama`, `deepseek-coder`
- **OpenAI**: `gpt-4`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-sonnet`

### General Purpose
- **Ollama**: `llama2`, `mistral`, `neural-chat`
- **OpenAI**: `gpt-4-turbo`
- **Anthropic**: `claude-3-opus`

### Lightweight/Fast
- **Ollama**: `phi3`, `gemma`
- **OpenAI**: `gpt-3.5-turbo`

Choose models based on your hardware capabilities and performance requirements.