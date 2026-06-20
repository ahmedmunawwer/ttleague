const path = require('path');
const sharp = require(path.join(__dirname, '..', 'client', 'node_modules', 'sharp'));

const sourcePath = path.join(__dirname, '..', 'client', 'public', 'paddle.png');
const outputDir = path.join(__dirname, '..', 'client', 'public');

async function generate() {
  await sharp(sourcePath).resize(192, 192).png().toFile(path.join(outputDir, 'icon-192.png'));
  console.log('Created icon-192.png (192×192)');
  await sharp(sourcePath).resize(512, 512).png().toFile(path.join(outputDir, 'icon-512.png'));
  console.log('Created icon-512.png (512×512)');
}

generate().catch(err => {
  console.error('Resize failed:', err);
  process.exit(1);
});
