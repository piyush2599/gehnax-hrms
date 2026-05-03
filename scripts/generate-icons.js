/**
 * Simple icon generator using SVG -> PNG conversion
 * Run: node scripts/generate-icons.js
 * Requires: npm install canvas (optional) or use any online icon generator
 *
 * Alternative: Use https://progressier.com or https://www.pwabuilder.com
 * to generate icons from your logo automatically.
 *
 * For now, this creates simple placeholder SVG-based icons.
 */

const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgTemplate = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#2563eb"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.12}"
    font-family="Arial, sans-serif"
    font-size="${size * 0.35}"
    font-weight="bold"
    fill="white"
    text-anchor="middle">HR</text>
</svg>`;

const iconsDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

sizes.forEach((size) => {
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svgTemplate(size));
  console.log(`Created: icon-${size}x${size}.svg`);
});

console.log("\nNote: For production, convert SVGs to PNGs or use proper icon generation tools.");
console.log("Quick option: https://www.pwabuilder.com/imageGenerator");
