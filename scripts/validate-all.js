#!/usr/bin/env node
/**
 * Run all validation checks
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  { name: 'Event Naming', script: 'validate-naming.js' },
  { name: 'Property Conventions', script: 'validate-properties.js' },
  { name: 'Cross-Event Consistency', script: 'validate-consistency.js' },
];

console.log('🚀 Running all instrumentation validation checks...\n');
console.log('='.repeat(60));
console.log();

let totalPassed = 0;
let totalFailed = 0;

scripts.forEach(({ name, script }) => {
  console.log(`▶️  Running: ${name}`);
  console.log('-'.repeat(60));

  try {
    const scriptPath = path.join(__dirname, script);
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    totalPassed++;
    console.log();
  } catch (error) {
    totalFailed++;
    console.log();
  }
});

console.log('='.repeat(60));
console.log();

if (totalFailed === 0) {
  console.log(`✅ All ${totalPassed} validation checks passed!\n`);
  process.exit(0);
} else {
  console.log(`❌ ${totalFailed} validation check(s) failed, ${totalPassed} passed\n`);
  process.exit(1);
}
