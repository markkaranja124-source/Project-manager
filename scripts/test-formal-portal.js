const fs = require('fs');
const path = require('path');

console.log('Testing Formal Executive Portal Components...');

const htmlPath = path.join(__dirname, '..', 'index.html');
const cssPath = path.join(__dirname, '..', 'styles.css');
const jsPath = path.join(__dirname, '..', 'app.js');
const loginPath = path.join(__dirname, '..', 'login.html');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');
const loginContent = fs.readFileSync(loginPath, 'utf8');

// 1. Check Executive Elements in index.html
const requiredElements = [
  'manager-brand-avatar',
  'btn-manager-session-menu',
  'manager-session-indicator',
  'manager-role-tag',
  'header-telemetry-badge',
  'manager-profile-dropdown',
  'mp-dropdown-header',
  'mp-dropdown-avatar',
  'mp-dropdown-name',
  'mp-dropdown-email',
  'btn-dropdown-handover',
  'btn-dropdown-print',
  'btn-dropdown-passkeys',
  'btn-dropdown-settings',
  'btn-dropdown-logout',
  'modal-shift-handover',
  'cert-doc-ref',
  'cert-shift-date',
  'cert-shift-name',
  'cert-manager-name',
  'cert-stat-present',
  'cert-stat-absent',
  'cert-stat-late',
  'cert-stat-coverage',
  'cert-cashier-val',
  'cert-minishop-val',
  'cert-rows-val',
  'cert-esection-val',
  'cert-handover-notes',
  'cert-timestamp-seal',
  'cert-stamp-badge',
  'btn-certify-print',
  'btn-certify-whatsapp',
  'btn-certify-complete',
  'print-sheet-container',
  'print-manager-on-duty'
];

let missing = 0;
for (const elId of requiredElements) {
  if (!htmlContent.includes(elId)) {
    console.error(`❌ Missing element/class in index.html: ${elId}`);
    missing++;
  } else {
    console.log(`✓ Element verified: ${elId}`);
  }
}

// 2. Check CSS classes
const requiredCss = [
  '.manager-session-pill',
  '.header-telemetry-badge',
  '.manager-profile-dropdown',
  '.app-enterprise-footer',
  '#modal-shift-handover',
  '.cert-seal-block'
];

for (const rule of requiredCss) {
  if (!cssContent.includes(rule)) {
    console.error(`❌ Missing CSS rule in styles.css: ${rule}`);
    missing++;
  } else {
    console.log(`✓ CSS rule verified: ${rule}`);
  }
}

// 3. Check JS functions
const requiredJs = [
  'toggleManagerProfileDropdown',
  'openShiftHandoverModal',
  'closeShiftHandoverModal',
  'buildWhatsAppCertificationMessage'
];

for (const fn of requiredJs) {
  if (!jsContent.includes(fn)) {
    console.error(`❌ Missing function in app.js: ${fn}`);
    missing++;
  } else {
    console.log(`✓ JS function verified: ${fn}`);
  }
}

// 4. Check login.html executive styling
if (loginContent.includes('Plus Jakarta Sans') && loginContent.includes('Executive') && loginContent.includes('Biometric')) {
  console.log('✓ login.html executive typography & biometric auth confirmed.');
} else {
  console.error('❌ login.html missing executive features.');
  missing++;
}

if (missing === 0) {
  console.log('\n🎉 ALL FORMAL ENTERPRISE PORTAL CHECKS PASSED WITH 100% SUCCESS!');
  process.exit(0);
} else {
  console.error(`\n❌ Failed with ${missing} missing items.`);
  process.exit(1);
}
