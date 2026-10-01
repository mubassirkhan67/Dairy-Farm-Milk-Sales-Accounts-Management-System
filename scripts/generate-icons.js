import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImage = path.resolve('src/assets/images/app_icon_cow_1790834753941.jpg');
const publicDir = path.resolve('public');

async function generateIcons() {
  console.log('Generating app icons from cow image...');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. pwa-512x512.png
  await sharp(sourceImage)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 2. pwa-192x192.png
  await sharp(sourceImage)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 3. apple-touch-icon.png (180x180)
  await sharp(sourceImage)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. pwa-maskable-512x512.png
  await sharp(sourceImage)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 5. favicon.ico / 64x64 png
  await sharp(sourceImage)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // 6. cow-app-icon.png (general UI use)
  await sharp(sourceImage)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'cow-app-icon.png'));

  // 7. icon.svg with embedded base64 image
  const imgBuffer = await sharp(sourceImage)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toBuffer();
  const b64 = imgBuffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <clipPath id="rounded">
    <rect width="512" height="512" rx="108" />
  </clipPath>
  <g clip-path="url(#rounded)">
    <image href="data:image/png;base64,${b64}" width="512" height="512" preserveAspectRatio="xMidYMid slice" />
  </g>
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

  console.log('Successfully generated all cow app icons in /public!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
