# NPM Publishing Instructions for CodeDuet

This guide will walk you through the complete process of building, testing, and publishing CodeDuet to npm so users can install it with:

```bash
npm install -g @codeduet-ai/codeduet-cli
```

## Prerequisites

### 1. Node.js and npm
Ensure you have Node.js 20+ and npm installed:
```bash
node --version  # Should be 20.0.0 or higher
npm --version
```

### 2. npm Account and Organization Access
- Create an npm account at https://npmjs.com if you don't have one
- Ensure you have access to the `@codeduet-ai` organization on npm
- If the organization doesn't exist, you'll need to create it or use a different scope

### 3. Authentication
Log in to npm from your terminal:
```bash
npm login
```
Follow the prompts to enter your npm credentials.

## Pre-Publication Steps

### 1. Clean and Install Dependencies
```bash
# Clean any previous builds
npm run clean

# Install all dependencies
npm ci
```

### 2. Build the Project
```bash
# Generate git commit info
npm run generate

# Build all packages
npm run build

# Create the bundle
npm run bundle
```

### 3. Verify the Build
Check that the bundle was created correctly:
```bash
ls -la bundle/
# Should show gemini.js and other bundle files
```

### 4. Test Locally
Test the CLI locally before publishing:
```bash
# Install locally for testing
npm install -g .

# Test all command aliases work
codeduet --version
cd-cli --version  
codeduet-code --version

# Test basic functionality
echo "Hello world" | codeduet-code
```

### 5. Update Version (if needed)
If this isn't the first publish or you need to increment the version:
```bash
# For patch version (0.1.0 -> 0.1.1)
npm version patch

# For minor version (0.1.0 -> 0.2.0)  
npm version minor

# For major version (0.1.0 -> 1.0.0)
npm version major
```

## Publishing Process

### 1. Dry Run (Recommended)
Test what will be published without actually publishing:
```bash
npm publish --dry-run
```

Review the output to ensure:
- All necessary files are included
- No sensitive files are included
- The package size is reasonable

### 2. Publish to npm
```bash
# If using @anthropic-ai scope for the first time, make it public
npm publish --access public

# For subsequent publishes
npm publish
```

### 3. Verify Publication
Check that your package is available:
```bash
# Search for your package
npm search @codeduet-ai/codeduet-cli

# View package info
npm view @codeduet-ai/codeduet-cli
```

### 4. Test Installation
Test the published package:
```bash
# Uninstall local version first
npm uninstall -g @codeduet-ai/codeduet-code

# Install from npm
npm install -g @codeduet-ai/codeduet-cli

# Test commands work
codeduet --version
cd-cli --version
codeduet-code --version
```

## Post-Publication

### 1. Update Documentation
Update README.md and other docs with the correct installation command:
```bash
npm install -g @codeduet-ai/codeduet-cli
```

### 2. Tag the Release (Optional)
Create a git tag for this release:
```bash
git tag v0.1.0
git push origin v0.1.0
```

### 3. Create GitHub Release (Optional)
Create a release on GitHub with the changelog and installation instructions.

## Troubleshooting

### Permission Issues
If you get permission errors:
```bash
# Check if you have access to the organization
npm access list packages @codeduet-ai

# If the organization doesn't exist, you may need to:
# 1. Create it on npmjs.com
# 2. Use a different scope like @your-username/codeduet-cli
# 3. Or publish without a scope (just "codeduet-cli")
```

### Build Issues
```bash
# Clean everything and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
npm run bundle
```

### Bundle Issues
If the bundle is missing or incorrect:
```bash
# Check if bundle directory exists and has content
ls -la bundle/
cat bundle/gemini.js | head -20

# Rebuild if needed
npm run bundle
```

### Version Conflicts
If the version already exists on npm:
```bash
# Increment version and try again
npm version patch
npm publish
```

## Files Included in Publication

The following files/directories are included in the npm package (see `package.json` "files" field):
- `bundle/` - The built CLI application
- `README.md` - Installation and usage instructions  
- `LICENSE` - License file

## Security Notes

- Never publish with `--access private` unless intended
- Review the dry-run output before publishing
- Ensure no sensitive information (API keys, tokens) is in the bundle
- The `.npmignore` file can be used to exclude additional files if needed

## Alternative: Using GitHub Packages

If you prefer to publish to GitHub Packages instead of npm:

1. Update package.json to include:
```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

2. Authenticate with GitHub:
```bash
npm login --registry=https://npm.pkg.github.com
```

3. Publish:
```bash
npm publish --registry=https://npm.pkg.github.com
```

Users would then install with:
```bash
npm install -g @anthropic-ai/codeduet-code --registry=https://npm.pkg.github.com
```

## Continuous Integration (Optional)

Consider setting up GitHub Actions to automate the publish process:

1. Add npm token to GitHub secrets
2. Create `.github/workflows/publish.yml`
3. Trigger on releases or version tags

This ensures consistent builds and reduces manual errors.