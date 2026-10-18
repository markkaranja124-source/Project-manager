const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 512x512 Master Luxury Stylish Capital G Vector
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E172C"/>
      <stop offset="50%" stop-color="#090E1D"/>
      <stop offset="100%" stop-color="#050811"/>
    </linearGradient>

    <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF0"/>
      <stop offset="25%" stop-color="#FDE68A"/>
      <stop offset="55%" stop-color="#F59E0B"/>
      <stop offset="85%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>

    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="60%" stop-color="#FDE68A"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>

    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(245, 158, 11, 0.2)"/>
      <stop offset="70%" stop-color="rgba(245, 158, 11, 0.05)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Base App Background with Rounded Squircle (PWA Standard) -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)"/>
  
  <!-- Subtle Outer Gold Filigree Border -->
  <rect x="20" y="20" width="472" height="472" rx="98" fill="none" stroke="url(#goldMetallic)" stroke-width="3" opacity="0.45"/>
  <rect x="28" y="28" width="456" height="456" rx="90" fill="none" stroke="#F59E0B" stroke-width="1" stroke-dasharray="4 6" opacity="0.25"/>

  <!-- Radial Amber Ambient Glow Behind Crest -->
  <circle cx="256" cy="256" r="180" fill="url(#goldGlow)"/>

  <!-- Outer Executive Crest Shield -->
  <path d="M256 64 L408 140 V264 C408 376 256 448 256 448 C256 448 104 376 104 264 V140 Z" 
        fill="#0D1528" 
        stroke="url(#goldMetallic)" 
        stroke-width="11" 
        filter="url(#shadow)"/>

  <!-- Inner Delicate Gold Shield Accent -->
  <path d="M256 92 L382 155 V254 C382 346 256 410 256 410 C256 410 130 346 130 254 V155 Z" 
        fill="none" 
        stroke="url(#goldMetallic)" 
        stroke-width="2.5" 
        stroke-dasharray="6 4" 
        opacity="0.55"/>

  <!-- Top Shield Star Accents -->
  <polygon points="256,110 259,118 268,119 261,125 263,134 256,129 249,134 251,125 244,119 253,118" fill="url(#goldLight)"/>

  <!-- ======================================================== -->
  <!-- STYLISH CAPITAL G MONOGRAM (Precision Vector Geometry)   -->
  <!-- ======================================================== -->

  <!-- Main Solid Gold G Sculpture -->
  <path d="
    M 342 196
    C 320 162 290 146 256 146
    C 192 146 144 195 144 260
    C 144 325 192 374 256 374
    C 318 374 358 334 364 278
    H 256
    V 234
    H 402
    C 404 246 405 258 405 272
    C 405 348 348 412 256 412
    C 168 412 102 344 102 260
    C 102 176 168 108 256 108
    C 310 108 354 134 382 174
    Z
  " fill="url(#goldMetallic)"/>

  <!-- Inner Faceted White/Gold Highlight Bevel -->
  <path d="
    M 342 272
    H 270
    V 252
    H 376
    C 374 310 328 358 256 358
    C 198 358 152 314 152 260
    C 152 206 198 162 256 162
    C 298 162 328 178 348 206
    L 332 216
    C 314 192 288 178 256 178
    C 208 178 170 214 170 260
    C 170 306 208 342 256 342
    C 308 342 338 310 342 272
    Z
  " fill="url(#goldLight)" opacity="0.92"/>

  <!-- Stylish Horizontal Spur / Crossbar Accent -->
  <rect x="256" y="240" width="144" height="6" fill="#FFFFFF" opacity="0.75"/>
</svg>`;

async function build() {
  const rootDir = path.join(__dirname, '..');
  const buf = Buffer.from(svg);

  // Generate crisp standard sizes
  await sharp(buf).resize(512, 512).png().toFile(path.join(rootDir, 'icon-512.png'));
  await sharp(buf).resize(192, 192).png().toFile(path.join(rootDir, 'icon-192.png'));
  await sharp(buf).resize(180, 180).png().toFile(path.join(rootDir, 'apple-touch-icon.png'));
  fs.writeFileSync(path.join(rootDir, 'icon.svg'), svg);

  console.log('✓ Successfully created high-res icon-512.png, icon-192.png, apple-touch-icon.png, and icon.svg with stylish capital G!');
}

build().catch(err => {
  console.error('Error generating stylish G icons:', err);
  process.exit(1);
});
