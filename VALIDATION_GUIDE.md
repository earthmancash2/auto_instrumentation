# Instrumentation Validation Guide

This guide explains how to use the automated validation tools to ensure analytics events follow the standards defined in [INSTRUMENTATION_STANDARDS.md](./INSTRUMENTATION_STANDARDS.md).

## Quick Start

### Run All Validations

```bash
npm run validate:events
```

This runs all three validation checks:
1. Event naming conventions
2. Property naming conventions
3. Cross-event consistency

### Run Individual Validations

```bash
# Validate event names only
npm run validate:event-names

# Validate properties only
npm run validate:event-properties

# Validate consistency only
npm run validate:event-consistency
```

---

## Validation Scripts

### 1. Event Naming Validation

**Script**: `scripts/validate-naming.js`

**Checks**:
- ✅ Event names follow `{object}_{action}` or `system_{object}_{action}` pattern
- ✅ Events use snake_case format
- ✅ Verbs are from controlled vocabulary
- ✅ Events use past tense only

**Example Output**:

```
✅ All 8 event names are valid!
```

**Or if errors found**:

```
❌ Found 2 naming errors in 8 events:

📄 services/search-service/src/controllers/search-controller.ts
   Event: searchRequestReceive
   ❌ Event name "searchRequestReceive" doesn't match required format: {object}_{action}
   ❌ Event verb "receive" in "searchRequestReceive" not in controlled vocabulary

📄 apps/marketplace-web/src/pages/search.tsx
   Event: SearchResultClicked
   ❌ Event name "SearchResultClicked" doesn't match required format: {object}_{action}
```

### 2. Property Validation

**Script**: `scripts/validate-properties.js`

**Checks**:
- ✅ Properties use snake_case
- ✅ Boolean properties have `is_`, `has_`, or `should_` prefix
- ✅ Numeric counts have `num_` or `total_` prefix
- ✅ Durations have `_ms` suffix
- ✅ Required core properties present for event type
- ✅ No abbreviations (ts, req, usr, etc.)

**Example Output**:

```
✅ All properties in 8 events are valid!
```

**Or if errors found**:

```
❌ Found 5 property errors in 8 events:

📄 services/search-service/src/controllers/search-controller.ts
   Event: search_api_request_received
   Properties: timestamp, event_name, requestId, query, prefetch, results, queryTime
   ❌ Property "requestId" not in snake_case
   ❌ Property "prefetch" missing type prefix (is_, has_, should_)
   ❌ Duration property "queryTime" missing _ms suffix
   ❌ Property "results" should use num_ or total_ prefix
```

### 3. Consistency Validation

**Script**: `scripts/validate-consistency.js`

**Checks**:
- ✅ Same property names used consistently across events
- ✅ Property types consistent (e.g., `request_id` always string)
- ✅ Events with same name have same properties

**Example Output**:

```
✅ All events are consistent!
```

**Or if errors found**:

```
❌ Found 2 consistency issues:

⚠️  Property "query_time_ms" has inconsistent types:
   Types found: string, number
   Usages:
      search_api_request_received (number) in services/search-service/src/controllers/search-controller.ts
      search_page_hydrated (string) in apps/marketplace-web/src/pages/search.tsx

⚠️  Event "search_result_clicked" has inconsistent properties across files:
   📄 apps/marketplace-web/src/pages/search.tsx
      Properties: request_id, search_id, product_id, result_position
   📄 apps/marketplace-web/src/components/SearchResults.tsx
      Properties: request_id, product_id, position
```

---

## CI/CD Integration

### GitHub Actions

A GitHub Actions workflow is included at `.github/workflows/validate-instrumentation.yml`.

**When it runs**:
- On every pull request
- On pushes to main branches

**What it does**:
1. Runs all three validation scripts
2. Fails the build if any validation fails
3. Comments on the PR with helpful error messages

**Example PR Comment**:

```
❌ Instrumentation validation failed. Please check the workflow run for details.

Common issues:
- Event names not in snake_case or not using past tense
- Properties missing type prefixes (is_, num_, total_)
- Missing required properties for event type
- Inconsistent property names across events

See INSTRUMENTATION_STANDARDS.md for full requirements.
```

### Other CI Systems

For other CI systems (CircleCI, Jenkins, GitLab CI), add this to your pipeline:

```yaml
# Example for any CI system
- name: Validate Instrumentation
  run: |
    npm install
    npm run validate:events
```

---

## How Validation Works

### Pattern Detection

The validation scripts scan all TypeScript/JavaScript files in the project (excluding `node_modules`, `.git`, `dist`, `build`, `.next`) and look for these patterns:

```typescript
// Pattern 1: analytics.track with object
analytics.track({
  name: 'search_api_request_received',
  properties: {
    request_id: 'abc-123',
    // ...
  }
});

// Pattern 2: analytics.track with string
analytics.track('search_api_request_received', {
  request_id: 'abc-123',
  // ...
});

// Pattern 3: console.log with [Analytics] prefix
console.log('[Analytics] search_page_rendered_ssr', {
  request_id: 'abc-123',
  // ...
});
```

### Event Type Detection

The scripts automatically detect event types based on patterns:

- **Frontend events**: Have `page` and `action` properties
- **Backend system events**: Start with `system_` prefix
- **Backend request cycle events**: Have `client_context` property or neither of above

Each type has different required properties checked automatically.

---

## Common Validation Errors & Fixes

### 1. Event Name Not Snake Case

❌ **Error**:
```
Event name "SearchResultClicked" doesn't match required format
```

✅ **Fix**:
```typescript
// Before
analytics.track({ name: 'SearchResultClicked', ... });

// After
analytics.track({ name: 'search_result_clicked', ... });
```

### 2. Verb Not in Controlled List

❌ **Error**:
```
Event verb "updating" not in controlled vocabulary
```

✅ **Fix**:
```typescript
// Before
analytics.track({ name: 'product_updating', ... });

// After
analytics.track({ name: 'product_updated', ... });  // Use past tense
```

### 3. Missing Type Prefix

❌ **Error**:
```
Boolean property "prefetch" missing type prefix
```

✅ **Fix**:
```typescript
// Before
properties: {
  prefetch: false,
  results: 10,
  query_time: 150
}

// After
properties: {
  is_prefetch: false,        // Add is_ prefix
  num_results: 10,            // Add num_ prefix
  query_time_ms: 150          // Add _ms suffix
}
```

### 4. Missing Required Properties

❌ **Error**:
```
Missing required frontend property: page
Missing required frontend property: viewport_width
```

✅ **Fix**:
```typescript
// Before (frontend event)
analytics.track({
  name: 'search_result_clicked',
  properties: {
    timestamp: new Date().toISOString(),
    event_name: 'search_result_clicked',
    request_id: 'abc-123',
    product_id: 'xyz-789'
  }
});

// After
analytics.track({
  name: 'search_result_clicked',
  properties: {
    timestamp: new Date().toISOString(),
    event_name: 'search_result_clicked',
    request_id: 'abc-123',

    // Add required frontend properties
    page: window.location.pathname,
    action: 'result_click',
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    device_pixel_ratio: window.devicePixelRatio,

    product_id: 'xyz-789'
  }
});
```

### 5. System Event with Request ID

❌ **Error**:
```
System events should not include request_id (not part of request cycle)
```

✅ **Fix**:
```typescript
// Before
analytics.track({
  name: 'system_inventory_synced',
  properties: {
    request_id: 'abc-123',  // ❌ Remove this
    service: 'pricing-service',
    num_products_synced: 1000
  }
});

// After
analytics.track({
  name: 'system_inventory_synced',
  properties: {
    // NO request_id for system events
    service: 'pricing-service',
    job_id: 'sync-job-456',
    trigger: 'scheduled',
    num_products_synced: 1000
  }
});
```

---

## Advanced Usage

### Custom Patterns

If you use custom analytics wrappers, update the patterns in each script:

```javascript
// In scripts/validate-naming.js
const ANALYTICS_PATTERNS = [
  /analytics\.track\(\s*{\s*name:\s*['"]([^'"]+)['"]/g,
  /analytics\.track\(\s*['"]([^'"]+)['"]/g,
  /\[Analytics\]\s+(\w+)/g,

  // Add your custom pattern
  /trackEvent\(['"]([^'"]+)['"]/g,
];
```

### Ignore Specific Files

To exclude files from validation, add them to the skip list:

```javascript
// In each validation script
if (!['node_modules', '.git', 'dist', 'build', '.next', 'test-fixtures'].includes(file)) {
  // ... scan file
}
```

### Pre-commit Hook

To run validation before every commit:

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run validate:events"
```

---

## Testing the Validators

### Manual Test

Create a test file with intentional errors:

```typescript
// test-instrumentation.ts
analytics.track({
  name: 'TestEventWithErrors',  // camelCase (wrong)
  properties: {
    requestId: 'abc-123',       // camelCase (wrong)
    prefetch: false,            // missing is_ prefix
    results: 10,                // ambiguous (should be num_results)
    ts: new Date().toISOString() // abbreviation (should be timestamp)
  }
});
```

Run validation:
```bash
npm run validate:events
```

Expected output: Should report 5+ errors.

### Check Existing Code

Run validation on the SSR instrumentation branch:

```bash
git checkout ssr-instrumentation
npm run validate:events
```

Expected output: Should pass with no errors (the SSR instrumentation follows all standards).

---

## FAQ

**Q: Can I add custom event verbs?**

A: Yes, edit `scripts/validate-naming.js` and add to the `CONTROLLED_VERBS` array. Be sure to document in `INSTRUMENTATION_STANDARDS.md`.

**Q: Why is validation so strict?**

A: Strict validation ensures consistency, which makes analytics data reliable and queries predictable. It's especially important when auto-instrumenting at scale.

**Q: Can I disable validation for specific events?**

A: Not recommended, but you can add comments in the validation scripts to skip specific event names if absolutely necessary.

**Q: What if I have legacy events that don't follow standards?**

A: Two options:
1. Gradually migrate legacy events to follow standards (recommended)
2. Update validation scripts to allow both legacy and new patterns during transition

**Q: How do I validate events in other languages (Python, Go, Java)?**

A: The validation scripts currently only scan TypeScript/JavaScript. For other languages, you'll need to:
1. Write similar scripts in that language
2. Use a common format (JSON) and validate that
3. Use OpenTelemetry or similar cross-language instrumentation with built-in validation

---

## Summary

The validation tooling ensures that:
- ✅ Event names are consistent and readable
- ✅ Properties follow type conventions
- ✅ Required context is always included
- ✅ Events are consistent across the codebase
- ✅ Standards are enforced at PR review time

This makes analytics data reliable, predictable, and easy to query at scale.
