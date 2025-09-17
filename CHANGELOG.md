# Changelog

## 0.1.0

- **BREAKING**: Rebranded from **Qwen Code** to **CodeDuet**
- **BREAKING**: Removed `qwen` and `qwen-cli` commands to avoid conflicts with official Qwen CLI
- **BREAKING**: Changed package name to `@anthropic-ai/codeduet-code`
- Added new primary commands: `codeduet`, `cd-cli`, and `codeduet-code` 
- Enhanced YOLO mode with `--dangerously-skip-permissions` alias
- Added environment variable support: `QWEN_YOLO=1`
- Added config file setting: `dangerouslySkipPermissions: true`
- Improved safety warnings for YOLO mode
- Updated documentation and branding throughout
- **NEW**: Local model support via Ollama and LM Studio
- **NEW**: Remote GPU support via RunPod.io
- **NEW**: Complete provider setup guide (PROVIDER_SETUP.md)
- Multi-provider support focus (OpenAI, Anthropic, local models, RunPod, etc.)

## 0.0.8

- Synced upstream `gemini-cli` to v0.1.19.
- Updated documentation branding from **Gemini CLI** to **Qwen Code**.
- Added multilingual docs links in `README.md`.
- Added deterministic cache control for the DashScope provider.
- Added option to choose a project-level or global save location.
- Limited `grep` results to 25 items by default.
- `grep` now respects `.geminiignore`.
- Miscellaneous improvements and bug fixes.

## 0.0.7

- Synced upstream `gemini-cli` to v0.1.18.
- Fixed MCP tools.
- Fixed Web Fetch tool.
- Fixed Web Search tool by switching from Google/Gemini to the Tavily API.
- Made tool calls tolerant of invalid-JSON parameters occasionally returned by the LLM.
- Prevented concurrent query submissions in rare cases.
- Corrected Qwen logger exit-handler setup.
- Separated static QR code and dynamic spinner components.

## 0.0.6

- Added usage statistics logging for Qwen integration.
- Made `/init` respect the configured context filename and aligned docs with `QWEN.md`.
- Fixed `EPERM` error when running `qwen --sandbox` on macOS.
- Fixed terminal flicker while waiting for login.
- Fixed `glm-4.5` model request error.

## 0.0.5

- Added Qwen OAuth login and up to 2,000 free requests per day.
- Synced upstream `gemini-cli` to v0.1.17.
- Added the `systemPromptMappings` configuration option.
