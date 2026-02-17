#!/usr/bin/env node
/**
 * Validate event naming conventions
 * - Checks snake_case format
 * - Validates against controlled verb list
 * - Ensures system_ prefix for non-request events
 */

const fs = require('fs');
const path = require('path');

// Controlled vocabulary
const CONTROLLED_VERBS = [
  // User actions
  'clicked', 'viewed', 'submitted', 'selected', 'typed', 'scrolled',
  'expanded', 'collapsed', 'toggled',
  // Backend actions
  'received', 'completed', 'failed', 'started', 'created', 'updated',
  'deleted', 'validated',
  // System actions
  'processed', 'synced', 'indexed', 'expired', 'scheduled',
];

// Patterns to find analytics calls
const ANALYTICS_PATTERNS = [
  /analytics\.track\(\s*{\s*name:\s*['"]([^'"]+)['"]/g,
  /analytics\.track\(\s*['"]([^'"]+)['"]/g,
  /\[Analytics\]\s+(\w+)/g,
  /console\.log\(['"].*Analytics.*['"].*['"](\w+)['"]/g,
];

function extractEventNames(content) {
  const events = new Set();

  ANALYTICS_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      events.add(match[1]);
    }
  });

  return Array.from(events);
}

function validateEventName(eventName) {
  const errors = [];

  // Check if it's a system event
  const isSystemEvent = eventName.startsWith('system_');

  // Check format
  const pattern = isSystemEvent
    ? /^system_[a-z]+(_[a-z]+)*_([a-z]+)$/
    : /^[a-z]+(_[a-z]+)*_([a-z]+)$/;

  if (!pattern.test(eventName)) {
    errors.push(`Event name "${eventName}" doesn't match required format: ${isSystemEvent ? 'system_{object}_{action}' : '{object}_{action}'}`);
    return errors;  // Can't extract verb if format is wrong
  }

  // Extract and validate verb (last word)
  const parts = eventName.split('_');
  const verb = parts[parts.length - 1];

  if (!CONTROLLED_VERBS.includes(verb)) {
    errors.push(`Event verb "${verb}" in "${eventName}" not in controlled vocabulary. Allowed: ${CONTROLLED_VERBS.join(', ')}`);
  }

  return errors;
}

function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip node_modules, .git, dist, build
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        scanDirectory(filePath, results);
      }
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const events = extractEventNames(content);

      if (events.length > 0) {
        results.push({
          file: filePath,
          events,
        });
      }
    }
  });

  return results;
}

function main() {
  console.log('🔍 Validating event naming conventions...\n');

  const rootDir = process.cwd();
  const results = scanDirectory(rootDir);

  let totalEvents = 0;
  let totalErrors = 0;
  const errorsByFile = {};

  results.forEach(({ file, events }) => {
    events.forEach(eventName => {
      totalEvents++;
      const errors = validateEventName(eventName);

      if (errors.length > 0) {
        totalErrors += errors.length;

        if (!errorsByFile[file]) {
          errorsByFile[file] = [];
        }

        errorsByFile[file].push({
          eventName,
          errors,
        });
      }
    });
  });

  // Print results
  if (totalErrors === 0) {
    console.log(`✅ All ${totalEvents} event names are valid!\n`);
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalErrors} naming errors in ${totalEvents} events:\n`);

    Object.entries(errorsByFile).forEach(([file, issues]) => {
      console.log(`📄 ${file}`);
      issues.forEach(({ eventName, errors }) => {
        console.log(`   Event: ${eventName}`);
        errors.forEach(error => {
          console.log(`   ❌ ${error}`);
        });
        console.log();
      });
    });

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateEventName, extractEventNames };
