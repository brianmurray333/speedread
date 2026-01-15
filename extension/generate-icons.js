#!/usr/bin/env node
/**
 * Generate PNG icons for the Chrome extension from SVG
 * Run with: node generate-icons.js
 * 
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating placeholder icons...');
  createPlaceholderIcons();
  process.exit(0);
}

// SVG icon with SpeedRead branding
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#1A1A1A"/>
  <g transform="translate(24, 24)">
    <path d="M40 23.33v46.67" stroke="#F7931A" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M53.33 40h6.67" stroke="#F7931A" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M53.33 26.67h6.67" stroke="#F7931A" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M10 60a3.33 3.33 0 0 1-3.33-3.33V13.33A3.33 3.33 0 0 1 10 10h16.67a13.33 13.33 0 0 1 13.33 13.33 13.33 13.33 0 0 1 13.33-13.33H70a3.33 3.33 0 0 1 3.33 3.33v43.33A3.33 3.33 0 0 1 70 60H50a10 10 0 0 0-10 10 10 10 0 0 0-10-10z" stroke="#F7931A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M20 40h6.67" stroke="#F7931A" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M20 26.67h6.67" stroke="#F7931A" stroke-width="6" stroke-linecap="round" fill="none"/>
  </g>
</svg>
`;

const sizes = [16, 48, 128];

async function generateIcons() {
  const iconsDir = path.join(__dirname, 'icons');
  
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon${size}.png`);
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }
  
  console.log('Done!');
}

// Fallback: create simple colored placeholder icons
function createPlaceholderIcons() {
  const iconsDir = path.join(__dirname, 'icons');
  
  // Create a simple 1x1 orange PNG and note that proper icons are needed
  console.log('');
  console.log('To generate proper icons:');
  console.log('1. npm install sharp');
  console.log('2. node generate-icons.js');
  console.log('');
  console.log('Or manually create PNG icons at:');
  console.log('  - extension/icons/icon16.png (16x16)');
  console.log('  - extension/icons/icon48.png (48x48)');
  console.log('  - extension/icons/icon128.png (128x128)');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  createPlaceholderIcons();
});
