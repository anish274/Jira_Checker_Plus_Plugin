const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('terser');

const SOURCE_DIR = __dirname;
const BUILD_DIR = path.join(__dirname, 'build');

// Clean build directory
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true });
}
fs.mkdirSync(BUILD_DIR);

// Files to process
const jsFiles = ['content.js', 'options.js', 'release.js', 'analytics.js'];
const copyFiles = ['manifest.json', 'options.html', 'options.css', 'styles.css', 'analytics.html', 'README.md'];

// Obfuscation options - Optimized for performance
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.5,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

// Process JavaScript files
console.log('Building Jira Checker Plus...\n');

jsFiles.forEach(file => {
  console.log(`Processing ${file}...`);
  const sourceCode = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
  
  // Obfuscate
  const obfuscated = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
  
  // Write to build directory
  fs.writeFileSync(path.join(BUILD_DIR, file), obfuscated.getObfuscatedCode());
  console.log(`✓ ${file} obfuscated`);
});

// Copy other files
copyFiles.forEach(file => {
  fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(BUILD_DIR, file));
  console.log(`✓ ${file} copied`);
});

// Copy icons directory
const iconsDir = path.join(SOURCE_DIR, 'icons');
const buildIconsDir = path.join(BUILD_DIR, 'icons');
if (fs.existsSync(iconsDir)) {
  fs.mkdirSync(buildIconsDir);
  fs.readdirSync(iconsDir).forEach(file => {
    fs.copyFileSync(path.join(iconsDir, file), path.join(buildIconsDir, file));
  });
  console.log('✓ Icons copied');
}

console.log('\n✅ Build completed successfully!');
console.log(`📦 Build output: ${BUILD_DIR}`);
