#!/usr/bin/env node
/**
 * Validate property naming conventions
 * - Checks snake_case format
 * - Validates type prefixes (is_, num_, total_, *_ms, *_at)
 * - Checks for required core properties
 * - Detects abbreviations
 */

const fs = require('fs');
const path = require('path');

// Required properties by event type
const REQUIRED_PROPERTIES = {
  frontend: [
    'timestamp', 'event_name', 'request_id', 'session_id',
    'user_id', 'device_id', 'cookie_id', 'user_agent',
    'page', 'action',
    'viewport_width', 'viewport_height', 'screen_width', 'screen_height', 'device_pixel_ratio',
  ],
  backend_request: [
    'timestamp', 'event_name', 'request_id', 'session_id',
    'user_id', 'client_context', 'service', 'endpoint',
  ],
  backend_system: [
    'timestamp', 'event_name', 'service', 'job_id', 'trigger',
  ],
};

// Known abbreviations to flag
const ABBREVIATIONS = ['ts', 'req', 'res', 'usr', 'msg', 'obj', 'arr', 'str', 'num', 'bool'];

// Files to exclude from validation (legacy/stub code)
const EXCLUDED_FILES = [
  'analytics.ts',
  'analytics-stub.ts',
  'auth.ts',
  'validate-naming.js',
  'validate-properties.js',
  'validate-consistency.js',
];

function isExcluded(filePath) {
  return EXCLUDED_FILES.some(excluded => filePath.endsWith(excluded));
}

function extractProperties(content) {
  const properties = [];

  // Pattern: analytics.track({ name: '...', properties: { ... } })
  const trackPattern = /analytics\.track\(\s*{\s*name:\s*['"]([^'"]+)['"][,\s]*properties:\s*{([^}]+)}/gs;
  let match;

  while ((match = trackPattern.exec(content)) !== null) {
    const eventName = match[1];
    const propsBlock = match[2];

    // Extract individual properties
    const propPattern = /(\w+):/g;
    let propMatch;
    const props = [];

    while ((propMatch = propPattern.exec(propsBlock)) !== null) {
      props.push(propMatch[1]);
    }

    if (props.length > 0) {
      properties.push({
        eventName,
        properties: props,
      });
    }
  }

  return properties;
}

function detectEventType(eventName, properties) {
  if (eventName.startsWith('system_')) {
    return 'backend_system';
  }

  // Frontend events have page/action properties
  if (properties.includes('page') && properties.includes('action')) {
    return 'frontend';
  }

  // Backend request cycle events have client_context
  if (properties.includes('client_context')) {
    return 'backend_request';
  }

  // Default to backend request (may need client_context added)
  return 'backend_request';
}

function validateProperty(propName, value = null) {
  const errors = [];

  // Check snake_case
  if (!/^[a-z]+(_[a-z]+)*$/.test(propName)) {
    errors.push(`Property "${propName}" not in snake_case`);
  }

  // Check for abbreviations
  const parts = propName.split('_');
  parts.forEach(part => {
    if (ABBREVIATIONS.includes(part)) {
      errors.push(`Property "${propName}" contains abbreviation "${part}"`);
    }
  });

  // Type-specific checks (if we know the value type)
  if (value !== null) {
    // Boolean should have is_/has_/should_ prefix
    if (typeof value === 'boolean' && !propName.match(/^(is|has|should)_/)) {
      errors.push(`Boolean property "${propName}" missing type prefix (is_, has_, should_)`);
    }

    // Duration should have _ms suffix
    if (typeof value === 'number' && (propName.includes('time') || propName.includes('duration')) && !propName.endsWith('_ms')) {
      errors.push(`Duration property "${propName}" missing _ms suffix`);
    }

    // Count should have num_/total_ prefix
    if (typeof value === 'number' && propName.includes('count') && !propName.match(/^(num_|total_)/)) {
      errors.push(`Count property "${propName}" should use num_ or total_ prefix`);
    }
  }

  return errors;
}

function validateEventProperties(eventName, properties) {
  const errors = [];
  const eventType = detectEventType(eventName, properties);

  // Check required properties
  const requiredProps = REQUIRED_PROPERTIES[eventType] || [];
  requiredProps.forEach(prop => {
    if (!properties.includes(prop)) {
      errors.push(`Missing required ${eventType} property: ${prop}`);
    }
  });

  // Validate each property
  properties.forEach(prop => {
    const propErrors = validateProperty(prop);
    errors.push(...propErrors);
  });

  // Event-type specific validation
  if (eventType === 'backend_system') {
    // System events should NOT have request_id or client_context
    if (properties.includes('request_id')) {
      errors.push('System events should not include request_id (not part of request cycle)');
    }
    if (properties.includes('client_context')) {
      errors.push('System events should not include client_context (not user-initiated)');
    }
  }

  return errors;
}

function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

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
      const events = extractProperties(content);

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
  console.log('🔍 Validating property naming conventions...\n');

  const rootDir = process.cwd();
  const results = scanDirectory(rootDir);

  let totalEvents = 0;
  let totalErrors = 0;
  const errorsByFile = {};

  results.forEach(({ file, events }) => {
    events.forEach(({ eventName, properties }) => {
      totalEvents++;
      const errors = validateEventProperties(eventName, properties);

      if (errors.length > 0) {
        totalErrors += errors.length;

        if (!errorsByFile[file]) {
          errorsByFile[file] = [];
        }

        errorsByFile[file].push({
          eventName,
          properties,
          errors,
        });
      }
    });
  });

  // Print results
  if (totalErrors === 0) {
    console.log(`✅ All properties in ${totalEvents} events are valid!\n`);
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalErrors} property errors in ${totalEvents} events:\n`);

    Object.entries(errorsByFile).forEach(([file, issues]) => {
      console.log(`📄 ${file}`);
      issues.forEach(({ eventName, properties, errors }) => {
        console.log(`   Event: ${eventName}`);
        console.log(`   Properties: ${properties.join(', ')}`);
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

module.exports = { validateProperty, validateEventProperties, extractProperties };
