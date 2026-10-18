const fs = require('fs');
const sharp = require('sharp');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="115" fill="#0B132B"/>
  <rect x="20" y="20" width="472" height="472" rx="95" fill="none" stroke="#F59E0B" stroke-width="6" opacity="0.35"/>
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>
  <!-- Shield emblem -->
  <path d="M256 80 L390 150 V270 C390 365 256 430 256 430 C256 430 122 365 122 270 V150 Z" fill="#151E34" stroke="url(#gold)" stroke-width="12"/>
  <!-- Inner border -->
  <path d="M256 102 L368 162 V262 C368 340 256 398 256 398 C256 398 144 340 144 262 V162 Z" fill="none" stroke="#F59E0B" stroke-width="3" opacity="0.5"/>
  <!-- RH Monogram -->
  <text x="256" y="270" font-family="Arial, Helvetica, sans-serif" font-size="115" font-weight="900" fill="url(#gold)" text-anchor="middle">RH</text>
  <text x="256" y="325" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="#CBD5E1" text-anchor="middle" letter-spacing="5">RIBHOUSE</text>
</svg>`;

async function build() {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(512, 512).png().toFile('icon-512.png');
  await sharp(buf).resize(192, 192).png().toFile('icon-192.png');
  await sharp(buf).resize(180, 180).png().toFile('apple-touch-icon.png');
  fs.writeFileSync('icon.svg', svg);
  console.log('✓ Successfully created icon-512.png, icon-192.png, apple-touch-icon.png, and icon.svg');
}

build().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
