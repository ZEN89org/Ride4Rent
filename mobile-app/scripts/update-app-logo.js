const fs = require('fs');
const path = require('path');
const { generateImageAsync } = require('@expo/image-utils');

const projectRoot = path.dirname(require.resolve('../package.json'));
const srcLogo = path.join(projectRoot, 'assets', 'images', 'applogo.png');

if (!fs.existsSync(srcLogo)) {
  console.error('Source logo not found at:', srcLogo);
  process.exit(1);
}

async function generateAndSave(src, width, height, destPath, mimeType = 'image/png') {
  const result = await generateImageAsync({ projectRoot }, { src, width, height, mimeType });
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(destPath, result.source);
  console.log(`Saved: ${path.relative(projectRoot, destPath)} (${width}x${height})`);
}

async function main() {
  console.log('Generating Expo and Android App Assets from applogo.png...');

  // 1. Expo root assets
  await generateAndSave(srcLogo, 1024, 1024, path.join(projectRoot, 'assets', 'images', 'icon.png'));
  await generateAndSave(srcLogo, 1024, 1024, path.join(projectRoot, 'assets', 'images', 'android-icon-foreground.png'));
  await generateAndSave(srcLogo, 1024, 1024, path.join(projectRoot, 'assets', 'images', 'android-icon-monochrome.png'));
  await generateAndSave(srcLogo, 1024, 1024, path.join(projectRoot, 'assets', 'images', 'splash-icon.png'));
  await generateAndSave(srcLogo, 48, 48, path.join(projectRoot, 'assets', 'images', 'favicon.png'));
  await generateAndSave(srcLogo, 1024, 1024, path.join(projectRoot, 'assets', 'img', 'ride4rent.png'));

  // 2. Android mipmap icons (ic_launcher.webp, ic_launcher_round.webp, ic_launcher_foreground.webp, ic_launcher_monochrome.webp)
  const mipmaps = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

  for (const m of mipmaps) {
    const targetDir = path.join(resDir, m.dir);
    if (fs.existsSync(targetDir)) {
      await generateAndSave(srcLogo, m.iconSize, m.iconSize, path.join(targetDir, 'ic_launcher.webp'), 'image/webp');
      await generateAndSave(srcLogo, m.iconSize, m.iconSize, path.join(targetDir, 'ic_launcher_round.webp'), 'image/webp');
      await generateAndSave(srcLogo, m.fgSize, m.fgSize, path.join(targetDir, 'ic_launcher_foreground.webp'), 'image/webp');
      await generateAndSave(srcLogo, m.fgSize, m.fgSize, path.join(targetDir, 'ic_launcher_monochrome.webp'), 'image/webp');
    }
  }

  // 3. Android splashscreen logos (drawable-*/splashscreen_logo.png)
  const drawables = [
    { dir: 'drawable-mdpi', size: 180 },
    { dir: 'drawable-hdpi', size: 270 },
    { dir: 'drawable-xhdpi', size: 360 },
    { dir: 'drawable-xxhdpi', size: 540 },
    { dir: 'drawable-xxxhdpi', size: 720 },
  ];

  for (const d of drawables) {
    const targetDir = path.join(resDir, d.dir);
    if (fs.existsSync(targetDir)) {
      await generateAndSave(srcLogo, d.size, d.size, path.join(targetDir, 'splashscreen_logo.png'), 'image/png');
    }
  }

  console.log('All app logos and launcher icons generated successfully!');
}

main().catch(console.error);
