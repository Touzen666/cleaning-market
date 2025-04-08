const fs = require('fs');
const path = require('path');

// Get current timestamp
const buildTime = new Date().toISOString();

// Read package.json to get version
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Path to .env.local
const envPath = path.join(process.cwd(), '.env.local');

// Read existing .env.local if it exists
let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

// Split into lines and process each line
const lines = envContent.split('\n');
const newLines = [];
let versionFound = false;
let buildTimeFound = false;

// Process existing lines
for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_APP_VERSION=')) {
        newLines.push(`NEXT_PUBLIC_APP_VERSION=${version}`);
        versionFound = true;
    } else if (line.startsWith('NEXT_PUBLIC_BUILD_TIME=')) {
        newLines.push(`NEXT_PUBLIC_BUILD_TIME=${buildTime}`);
        buildTimeFound = true;
    } else if (line.trim() !== '') {
        newLines.push(line);
    }
}

// Add version and build time if they weren't found
if (!versionFound) {
    newLines.push(`NEXT_PUBLIC_APP_VERSION=${version}`);
}
if (!buildTimeFound) {
    newLines.push(`NEXT_PUBLIC_BUILD_TIME=${buildTime}`);
}

// Write back to file
fs.writeFileSync(envPath, newLines.join('\n') + '\n');

console.log('Version and build time updated successfully!'); 