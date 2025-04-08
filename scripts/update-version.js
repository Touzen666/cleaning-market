import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get current timestamp
const buildTime = new Date().toISOString();

// Read package.json to get and update version
const packageJsonPath = join(dirname(__dirname), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Increment patch version
const [major, minor, patch] = packageJson.version.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;
packageJson.version = newVersion;

// Write updated version back to package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Create or update .env.local file
const envPath = join(dirname(__dirname), '.env.local');
let envContent = '';

if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
}

// Split into lines and process each line
const lines = envContent.split('\n');
const newLines = [];
let versionFound = false;
let buildTimeFound = false;

// Process existing lines
for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_APP_VERSION=')) {
        newLines.push(`NEXT_PUBLIC_APP_VERSION=${newVersion}`);
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
    newLines.push(`NEXT_PUBLIC_APP_VERSION=${newVersion}`);
}
if (!buildTimeFound) {
    newLines.push(`NEXT_PUBLIC_BUILD_TIME=${buildTime}`);
}

// Write back to file
writeFileSync(envPath, newLines.join('\n') + '\n');

console.log(`Version updated to ${newVersion}`);
console.log('Build time updated successfully!'); 