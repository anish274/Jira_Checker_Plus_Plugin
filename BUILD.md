# Build & Release Guide

## Prerequisites

Install Node.js (v16 or higher): https://nodejs.org/

## Setup

```bash
# Install dependencies
npm install
```

## Build Process

### 1. Development Build (No obfuscation)
For testing and development:
```bash
# Just copy files to build directory
node build.js
```

### 2. Production Build (With obfuscation)
For release to colleagues:
```bash
# Build with obfuscation + create ZIP
npm run release
```

This will:
- ✅ Obfuscate JavaScript code (content.js, options.js)
- ✅ Minify and compress code
- ✅ Add anti-tampering protection
- ✅ Create distributable ZIP in `releases/` folder

## Security Features

### Code Obfuscation
- Variable/function names converted to hexadecimal
- Control flow flattening
- Dead code injection
- String array encoding (Base64)
- Self-defending code

### Protection Against
- ✅ Code reverse engineering
- ✅ Unauthorized modifications
- ✅ Code theft
- ✅ Debugging attempts

## Release Process

### For Version 0.6.0:

1. **Update version** in `manifest.json`
2. **Build release**:
   ```bash
   npm run release
   ```
3. **Output**: `releases/jira-checker-plus-0.6.0.zip`
4. **Upload to GitHub releases**
5. **Share with colleagues**

## File Structure

```
Source (Development):
├── content.js          # Original readable code
├── options.js
├── manifest.json
└── ...

Build (Production):
├── content.js          # Obfuscated code
├── options.js          # Obfuscated code
├── manifest.json
└── ...

Releases:
└── jira-checker-plus-0.6.0.zip  # Distributable package
```

## Testing Build

1. Build the release:
   ```bash
   npm run release
   ```

2. Extract ZIP from `releases/` folder

3. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked → Select extracted folder
   - Test all features

## Distribution

**Option 1: GitHub Releases**
- Upload ZIP to GitHub releases
- Colleagues download and install

**Option 2: Chrome Web Store**
- Upload ZIP to Chrome Web Store
- Automatic updates for all users

## Security Notes

⚠️ **Keep source code private**
- Only share the built/obfuscated version
- Don't commit `build/` or `releases/` to public repos
- Source code stays in private repository

✅ **What colleagues get**
- Obfuscated, minified code
- Difficult to reverse engineer
- Protected intellectual property

## Troubleshooting

**Build fails:**
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run release
```

**Extension doesn't load:**
- Check manifest.json syntax
- Verify all files are in build directory
- Check Chrome console for errors
