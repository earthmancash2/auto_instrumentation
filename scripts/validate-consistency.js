#!/usr/bin/env node
/**
 * Validate consistency across events
 * - Same property names used consistently
 * - Same property types across events
 * - Detect duplicate event names
 */

const fs = require('fs');
const path = require('path');

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

function extractEventsWithProperties(content) {
  const events = [];

  // Pattern: analytics.track({ name: '...', properties: { key: value, ... } })
  const trackPattern = /analytics\.track\(\s*{\s*name:\s*['"]([^'"]+)['"][,\s]*properties:\s*{([^}]+)}/gs;
  let match;

  while ((match = trackPattern.exec(content)) !== null) {
    const eventName = match[1];
    const propsBlock = match[2];

    // Extract property: value pairs (simplified - doesn't handle nested objects well)
    const properties = {};
    const propPattern = /(\w+):\s*([^,\n]+)/g;
    let propMatch;

    while ((propMatch = propPattern.exec(propsBlock)) !== null) {
      const key = propMatch[1];
      const value = propMatch[2].trim();

      // Try to infer type from value
      let type = 'unknown';
      if (value === 'true' || value === 'false') {
        type = 'boolean';
      } else if (/^\d+$/.test(value)) {
        type = 'number';
      } else if (value.startsWith("'") || value.startsWith('"')) {
        type = 'string';
      } else if (value.startsWith('[')) {
        type = 'array';
      } else if (value.startsWith('{')) {
        type = 'object';
      }

      properties[key] = type;
    }

    events.push({
      eventName,
      properties,
    });
  }

  return events;
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
      const events = extractEventsWithProperties(content);

      events.forEach(event => {
        results.push({
          file: filePath,
          ...event,
        });
      });
    }
  });

  return results;
}

function analyzeConsistency(events) {
  const errors = [];

  // Group events by name
  const eventsByName = {};
  events.forEach(event => {
    if (!eventsByName[event.eventName]) {
      eventsByName[event.eventName] = [];
    }
    eventsByName[event.eventName].push(event);
  });

  // Check for duplicate event names (might be OK if same properties)
  Object.entries(eventsByName).forEach(([eventName, occurrences]) => {
    if (occurrences.length > 1) {
      // Check if properties differ
      const firstProps = JSON.stringify(Object.keys(occurrences[0].properties).sort());
      const allSame = occurrences.every(occ => {
        const props = JSON.stringify(Object.keys(occ.properties).sort());
        return props === firstProps;
      });

      if (!allSame) {
        errors.push({
          type: 'inconsistent_properties',
          eventName,
          occurrences: occurrences.map(o => ({
            file: o.file,
            properties: Object.keys(o.properties),
          })),
        });
      }
    }
  });

  // Build property type map (property name → expected type)
  const propertyTypes = {};
  events.forEach(event => {
    Object.entries(event.properties).forEach(([propName, propType]) => {
      if (!propertyTypes[propName]) {
        propertyTypes[propName] = new Set();
      }
      propertyTypes[propName].add(propType);
    });
  });

  // Check for properties with inconsistent types
  Object.entries(propertyTypes).forEach(([propName, types]) => {
    if (types.size > 1) {
      // Find which events use this property with different types
      const usages = [];
      events.forEach(event => {
        if (event.properties[propName]) {
          usages.push({
            eventName: event.eventName,
            file: event.file,
            type: event.properties[propName],
          });
        }
      });

      errors.push({
        type: 'inconsistent_types',
        propName,
        types: Array.from(types),
        usages,
      });
    }
  });

  return errors;
}

function main() {
  console.log('🔍 Validating consistency across events...\n');

  const rootDir = process.cwd();
  const events = scanDirectory(rootDir);

  console.log(`Found ${events.length} event tracking calls\n`);

  const errors = analyzeConsistency(events);

  if (errors.length === 0) {
    console.log('✅ All events are consistent!\n');
    process.exit(0);
  } else {
    console.log(`❌ Found ${errors.length} consistency issues:\n`);

    errors.forEach(error => {
      if (error.type === 'inconsistent_properties') {
        console.log(`⚠️  Event "${error.eventName}" has inconsistent properties across files:`);
        error.occurrences.forEach(occ => {
          console.log(`   📄 ${occ.file}`);
          console.log(`      Properties: ${occ.properties.join(', ')}`);
        });
        console.log();
      } else if (error.type === 'inconsistent_types') {
        console.log(`⚠️  Property "${error.propName}" has inconsistent types:`);
        console.log(`   Types found: ${error.types.join(', ')}`);
        console.log(`   Usages:`);
        error.usages.forEach(usage => {
          console.log(`      ${usage.eventName} (${usage.type}) in ${usage.file}`);
        });
        console.log();
      }
    });

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeConsistency, extractEventsWithProperties };
