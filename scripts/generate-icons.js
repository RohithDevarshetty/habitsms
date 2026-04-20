const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  for (const size of sizes) {
    const filename = `icon-${size}x${size}.png`;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconDir, filename));
    console.log(`Generated ${filename}`);
  }
  
  // Also generate apple-touch-icon for iOS
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');
  
  // Generate maskable icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconDir, 'icon-512x512.png'));
  console.log('Generated maskable icon');
}

generateIcons().then(() => console.log('All icons generated!')).catch(console.error);
