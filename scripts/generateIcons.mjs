/**
 * Generate PWA icons from SVG source
 * Run with: node scripts/generateIcons.mjs
 * 
 * Requires: npm install sharp
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// SVG source with proper sizing for each icon
const createSvg = (size, padding = 0.15) => {
  const iconSize = size * (1 - padding * 2);
  const offset = size * padding;
  const scale = iconSize / 24;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#18181b"/>
    <g transform="translate(${offset}, ${offset}) scale(${scale})">
      <path d="M12 7v14" fill="none" stroke="#F7931A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 12h2" fill="none" stroke="#F7931A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 8h2" fill="none" stroke="#F7931A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" fill="none" stroke="#F7931A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6 12h2" fill="none" stroke="#F7931A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6 8h2" fill="none" stroke="#F7931A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
};

// Maskable icon needs more padding for safe zone
const createMaskableSvg = (size) => createSvg(size, 0.2);

const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
];

async function generateIcons() {
  const outputDir = path.join(rootDir, 'public', 'icons');
  
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  for (const icon of icons) {
    const svg = Buffer.from(createSvg(icon.size));
    
    await sharp(svg)
      .png()
      .toFile(path.join(outputDir, icon.name));
    
    console.log(`✓ Generated ${icon.name}`);
  }

  // Also copy apple-touch-icon to root public for Safari
  const appleSvg = Buffer.from(createSvg(180));
  await sharp(appleSvg)
    .png()
    .toFile(path.join(rootDir, 'public', 'apple-touch-icon.png'));
  console.log('✓ Generated public/apple-touch-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
