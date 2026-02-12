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
const jsFiles = ['content.js', 'options.js'];
const copyFiles = ['manifest.json', 'options.html', 'options.css', 'styles.css', 'README.md'];

// Obfuscation options
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
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
