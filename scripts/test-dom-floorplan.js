/**
 * Headless DOM verification for Floor Plan elements in index.html & app.js
 */

const fs = require('fs');
const path = require('path');

console.log('Testing HTML DOM elements for Floor Plan...');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const requiredIds = [
  'view-floorplan',
  'fp-date-selector',
  'fp-shift-selector',
  'fp-summary-stats',
  'floorplan-blueprint-card',
  'fp-svg-container',
  'floorplan-sidebar',
  'fp-employees-list',
  'btn-open-manage-assignments',
  'modal-table-assign',
  'modal-table-assign-title',
  'btn-close-table-assign',
  'assign-modal-station-id',
  'assign-modal-station-name',
  'assign-modal-section-info',
  'select-assign-staff',
  'input-assign-notes',
  'btn-unassign-table',
  'btn-cancel-table-assign',
  'btn-save-table-assign',
  'modal-bulk-assignments',
  'btn-close-bulk-assign',
  'bulk-assign-table-container',
  'btn-auto-assign-roster',
  'btn-cancel-bulk-assign',
  'btn-save-bulk-assign'
];

let missing = 0;
requiredIds.forEach(id => {
  if (!html.includes(`id="${id}"`)) {
    console.error(`❌ Missing DOM element: #${id}`);
    missing++;
  } else {
    console.log(`✓ Element found: #${id}`);
  }
});

// Check nav tab
if (html.includes('data-target="view-floorplan"')) {
  console.log('✓ Navigation tab for view-floorplan found.');
} else {
  console.error('❌ Missing data-target="view-floorplan" in nav tabs.');
  missing++;
}

// Check CSS
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const requiredClasses = [
  '.fp-header-bar',
  '.fp-workspace',
  '.fp-blueprint-area',
  '.fp-blueprint-card',
  '.fp-svg-canvas',
  '.fp-station',
  '.fp-station:hover',
  '.fp-station.highlighted',
  '.fp-sidebar',
  '.fp-employees-list',
  '.fp-legend-box',
  '.fp-status-indicator'
];

requiredClasses.forEach(cls => {
  if (css.includes(cls)) {
    console.log(`✓ CSS rule found: ${cls}`);
  } else {
    console.error(`❌ Missing CSS rule: ${cls}`);
    missing++;
  }
});

if (missing === 0) {
  console.log('\n🎉 ALL DOM & CSS CHECKS PASSED WITH ZERO ERRORS!');
} else {
  console.error(`\n❌ ${missing} checks failed.`);
  process.exit(1);
}
