#!/usr/bin/env node
/**
 * Validate event naming conventions
 * - Checks snake_case format
 * - Validates against controlled verb list
 * - Ensures system_ prefix for non-request events
 */

const fs = require('fs');
const path = require('path');

// User action verbs (for user action events only)
const USER_ACTION_VERBS = [
  'clicked', 'viewed', 'typed', 'submitted', 'selected',
  'scrolled', 'expanded', 'collapsed', 'toggled',
];

// Request stages (for request cycle events)
const REQUEST_STAGES = {
  backend: ['received', 'started', 'completed', 'failed'],
  frontend: ['rendered', 'hydration', 'interactive'],
  resource: ['created', 'updated', 'deleted', 'validated'],
};

// System stages (for system_ events)
const SYSTEM_STAGES = [
  'processed', 'synced', 'indexed', 'expired', 'scheduled',
];

// Flatten all request stages
const ALL_REQUEST_STAGES = [
  ...REQUEST_STAGES.backend,
  ...REQUEST_STAGES.frontend,
  ...REQUEST_STAGES.resource,
];

// Files to exclude from validation (legacy/stub code)
const EXCLUDED_FILES = [
  'analytics.ts',                    // Legacy analytics helper
  'analytics-stub.ts',               // Fake/stub analytics
  'auth.ts',                         // Legacy auth events
  'validate-naming.js',              // This script (has examples)
  'validate-properties.js',          // Property validator (has examples)
  'validate-consistency.js',         // Consistency validator (has examples)
];

function isExcluded(filePath) {
  return EXCLUDED_FILES.some(excluded => filePath.endsWith(excluded));
}

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

  // Check basic format (snake_case)
  if (!/^[a-z]+(_[a-z]+)*$/.test(eventName)) {
    errors.push(`Event name "${eventName}" must be in snake_case`);
    return errors;
  }

  const parts = eventName.split('_');
  const lastPart = parts[parts.length - 1];

  // Category 1: System events (system_{object}_{stage})
  if (eventName.startsWith('system_')) {
    if (parts.length < 3) {
      errors.push(`System event "${eventName}" must follow pattern: system_{object}_{stage}`);
      return errors;
    }

    if (!SYSTEM_STAGES.includes(lastPart)) {
      errors.push(`System event "${eventName}" uses stage "${lastPart}" which is not in system stage list. Allowed: ${SYSTEM_STAGES.join(', ')}`);
    }
    return errors;
  }

  // Category 2: Request cycle events ({object}_request_{stage} or {object}_{stage})
  const hasRequestInName = eventName.includes('_request_');
  const isRequestStage = ALL_REQUEST_STAGES.includes(lastPart);

  if (hasRequestInName) {
    // Must be {object}_request_{stage} pattern
    if (!isRequestStage) {
      errors.push(`Request cycle event "${eventName}" uses stage "${lastPart}" which is not in request stage list. Allowed: ${ALL_REQUEST_STAGES.join(', ')}`);
    }
    return errors;
  }

  // Check if last part is a known request stage (for {object}_{stage} pattern)
  if (isRequestStage) {
    // This is a valid request cycle event using {object}_{stage} pattern
    return errors;
  }

  // Category 3: User action events ({object}_{user_action})
  // Last part must be a user action verb
  if (!USER_ACTION_VERBS.includes(lastPart)) {
    errors.push(
      `Event "${eventName}" uses "${lastPart}" which is not in user action verb list. ` +
      `Allowed user verbs: ${USER_ACTION_VERBS.join(', ')}. ` +
      `If this is a request cycle event, use pattern: {object}_request_{stage} with stages: ${ALL_REQUEST_STAGES.join(', ')}`
    );
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
      // Skip excluded files
      if (isExcluded(filePath)) {
        return;
      }

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
  console.log('ℹ️  Excluding legacy/stub files:', EXCLUDED_FILES.join(', '));
  console.log();

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
