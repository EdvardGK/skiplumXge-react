#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Create output array to collect all diagnostic info
let diagnosticOutput = [];

function log(message) {
  console.log(message);
  diagnosticOutput.push(message);
}

log('🔍 System Diagnostics for Node.js Package Manager Issues\n');
log('='.repeat(60));

// Helper function to safely execute commands
function safeExec(command, description) {
  log(`\n📋 ${description}`);
  log(`Command: ${command}`);
  log('-'.repeat(40));
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: 'pipe'
    }).trim();
    log(output || '[No output]');
    return output;
  } catch (error) {
    log(`❌ Error: ${error.message}`);
    if (error.stdout) log(`Stdout: ${error.stdout}`);
    if (error.stderr) log(`Stderr: ${error.stderr}`);
    return null;
  }
}

// Helper function to check file existence
function checkFile(filePath, description) {
  log(`\n📄 ${description}`);
  log(`Path: ${filePath}`);
  log('-'.repeat(40));
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      log(`✅ EXISTS - Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
      return true;
    } else {
      log('❌ NOT FOUND');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking file: ${error.message}`);
    return false;
  }
}

// Helper function to check directory contents
function checkDirectory(dirPath, description, pattern = null) {
  log(`\n📁 ${description}`);
  log(`Path: ${dirPath}`);
  log('-'.repeat(40));
  try {
    if (fs.existsSync(dirPath)) {
      const items = fs.readdirSync(dirPath);
      let filteredItems = items;

      if (pattern) {
        filteredItems = items.filter(item => item.includes(pattern));
        log(`✅ Directory exists with ${items.length} total items`);
        log(`🔍 Items matching '${pattern}': ${filteredItems.length}`);
        if (filteredItems.length > 0) {
          filteredItems.slice(0, 10).forEach(item => log(`  - ${item}`));
          if (filteredItems.length > 10) log(`  ... and ${filteredItems.length - 10} more`);
        }
      } else {
        log(`✅ Directory exists with ${items.length} items`);
        if (items.length <= 20) {
          items.forEach(item => log(`  - ${item}`));
        } else {
          items.slice(0, 10).forEach(item => log(`  - ${item}`));
          log(`  ... and ${items.length - 10} more items`);
        }
      }
      return filteredItems;
    } else {
      log('❌ Directory not found');
      return [];
    }
  } catch (error) {
    log(`❌ Error reading directory: ${error.message}`);
    return [];
  }
}

// System Information
log('🖥️  SYSTEM INFORMATION');
log('='.repeat(60));
log(`OS: ${os.type()} ${os.release()} ${os.arch()}`);
log(`Platform: ${os.platform()}`);
log(`Node.js: ${process.version}`);
log(`Current Working Directory: ${process.cwd()}`);

// Environment Variables
log('\n🌍 ENVIRONMENT VARIABLES');
log('='.repeat(60));
const envVars = ['PATH', 'NODE_PATH', 'NPM_CONFIG_PREFIX', 'YARN_CACHE_FOLDER', 'APPDATA', 'LOCALAPPDATA'];
envVars.forEach(envVar => {
  const value = process.env[envVar];
  log(`${envVar}: ${value || '[NOT SET]'}`);
});

// Node.js and Package Manager Versions
safeExec('node --version', 'Node.js Version');
safeExec('npm --version', 'npm Version');
safeExec('yarn --version', 'Yarn Version (if installed)');

// npm Configuration
safeExec('npm config list', 'npm Configuration');
safeExec('npm config get prefix', 'npm Global Prefix');
safeExec('npm config get cache', 'npm Cache Location');
safeExec('npm config get registry', 'npm Registry');

// Check for multiple Node.js installations
safeExec('where node', 'Node.js Installation Locations (Windows)');
safeExec('where npm', 'npm Installation Locations (Windows)');
safeExec('where yarn', 'Yarn Installation Locations (Windows)');

// Project-specific checks
log('\n📦 PROJECT-SPECIFIC CHECKS');
log('='.repeat(60));

// Lock files
checkFile('package.json', 'Package.json');
checkFile('package-lock.json', 'npm Lock File');
checkFile('yarn.lock', 'Yarn Lock File');
checkFile('.yarnrc', 'Yarn RC File');
checkFile('.yarnrc.yml', 'Yarn RC YAML File');

// Node modules
const nodeModulesExists = checkFile('node_modules', 'Node Modules Directory');
if (nodeModulesExists) {
  checkDirectory('node_modules', 'Node Modules Contents (top level)', null);
  checkDirectory('node_modules/.bin', 'Node Modules Bin Directory', null);

  // Check for Next.js specifically
  checkFile('node_modules/next', 'Next.js Installation');
  checkDirectory('node_modules/next/dist/bin', 'Next.js Binary Directory', null);
  checkFile('node_modules/next/dist/bin/next', 'Next.js Binary File');

  // Check npm bin links
  checkDirectory('node_modules/.bin', 'NPM Binary Links', 'next');
}

// Check for global installations
safeExec('npm list -g --depth=0', 'Global npm Packages');

// Package.json scripts
log('\n📜 PACKAGE.JSON SCRIPTS');
log('='.repeat(60));
try {
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts) {
      Object.entries(packageJson.scripts).forEach(([script, command]) => {
        log(`${script}: ${command}`);
      });
    } else {
      log('No scripts defined');
    }
  }
} catch (error) {
  log(`Error reading package.json: ${error.message}`);
}

// Try to execute the problematic commands
log('\n🧪 COMMAND EXECUTION TESTS');
log('='.repeat(60));

safeExec('npm run --silent', 'List available npm scripts');

// Test Next.js execution methods
log('\n🔧 NEXT.JS EXECUTION TESTS');
log('='.repeat(60));

safeExec('npx next --version', 'Next.js via npx');
safeExec('node_modules\\.bin\\next --version', 'Next.js via direct binary (Windows)');
safeExec('node node_modules/next/dist/bin/next --version', 'Next.js via Node.js direct');

// Windows-specific checks
if (os.platform() === 'win32') {
  log('\n🪟 WINDOWS-SPECIFIC CHECKS');
  log('='.repeat(60));

  safeExec('where cmd', 'CMD Location');
  safeExec('echo %PATHEXT%', 'Windows Path Extensions');

  // Check for .cmd files in node_modules/.bin
  if (fs.existsSync('node_modules/.bin')) {
    const binFiles = fs.readdirSync('node_modules/.bin');
    const cmdFiles = binFiles.filter(f => f.endsWith('.cmd'));
    const nextCmdFiles = cmdFiles.filter(f => f.includes('next'));

    log(`\n.CMD files in node_modules/.bin: ${cmdFiles.length}`);
    cmdFiles.slice(0, 10).forEach(file => log(`  - ${file}`));

    log(`\nNext.js .CMD files: ${nextCmdFiles.length}`);
    nextCmdFiles.forEach(file => log(`  - ${file}`));
  }
}

log('\n' + '='.repeat(60));
log('🏁 Diagnostics Complete!');
log('='.repeat(60));

// Summary and recommendations
log('\n💡 QUICK ANALYSIS:');
if (!fs.existsSync('node_modules')) {
  log('❌ ISSUE: node_modules directory missing - run npm install');
} else if (!fs.existsSync('node_modules/.bin')) {
  log('❌ ISSUE: node_modules/.bin directory missing - corrupted installation');
} else {
  const binFiles = fs.readdirSync('node_modules/.bin');
  const hasNextCmd = binFiles.some(f => f.includes('next') && f.endsWith('.cmd'));
  const hasNext = binFiles.some(f => f.includes('next'));

  if (!hasNext) {
    log('❌ ISSUE: Next.js not found in node_modules/.bin');
  } else if (!hasNextCmd && os.platform() === 'win32') {
    log('❌ ISSUE: Next.js .cmd file missing (Windows binary issue)');
  } else {
    log('✅ Basic installation looks OK - may be a PATH or execution issue');
  }
}

if (fs.existsSync('package-lock.json') && fs.existsSync('yarn.lock')) {
  log('⚠️  WARNING: Both npm and yarn lock files present - choose one package manager');
}

// Write all diagnostics to file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = `diagnostic-output-${timestamp}.txt`;
const outputContent = diagnosticOutput.join('\n');

try {
  fs.writeFileSync(outputFile, outputContent);
  log(`\n📄 Diagnostic report saved to: ${outputFile}`);
} catch (error) {
  log(`❌ Failed to save diagnostic report: ${error.message}`);
}