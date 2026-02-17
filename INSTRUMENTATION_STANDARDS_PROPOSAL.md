# Instrumentation Standards Proposal

## Overview

This document proposes how `INSTRUMENTATION_STANDARDS.md` should be structured and how agents can use it for auto-instrumentation across multiple services, repos, and languages.

**Design Principles:**
1. **Language-agnostic**: Rules apply to events regardless of implementation language
2. **Manual guidelines**: Not full schema maintenance—focus on naming and property conventions
3. **Enforceable**: Rules can be validated via automated tests at PR review stage
4. **Multi-repo**: Works across backend services, frontend apps, APIs

---

## Proposed Document Structure

### 1. Naming Conventions

**Purpose**: Ensure all events follow consistent, readable naming patterns

**Format**:
```markdown
## Event Naming Conventions

### Rules (REQUIRED)
- **Format**: `{object}_{action}` in snake_case
- **Tense**: Past tense only
- **Vocabulary**: MUST use verbs from controlled list (see below)

### Controlled Verb List

Events MUST use one of these approved verbs (past tense):

**User Actions**:
- `clicked` - User clicked/tapped an element
- `viewed` - User viewed content (page, product, etc.)
- `submitted` - User submitted a form
- `selected` - User made a selection from options
- `typed` - User entered text (search, input)
- `scrolled` - User scrolled content
- `expanded` - User expanded collapsible content
- `collapsed` - User collapsed expanded content
- `toggled` - User toggled a setting/switch

**Backend Actions**:
- `received` - Server received a request
- `completed` - Operation finished successfully
- `failed` - Operation failed with error
- `started` - Long-running operation initiated
- `created` - New resource created
- `updated` - Existing resource modified
- `deleted` - Resource removed
- `validated` - Data validation occurred

**System Actions** (non-request cycle):
- `processed` - Background job/queue processing
- `synced` - Data synchronization occurred
- `indexed` - Search/cache index updated
- `expired` - Cache/session expiration
- `scheduled` - Future task scheduled

### Event Categories by Prefix

**Request cycle events** (standard naming):
- `{object}_{action}` - No special prefix
- MUST include client context properties
- Examples: `search_api_request_received`, `order_payment_completed`

**System/background events** (non-request cycle):
- `system_{object}_{action}` - Prefix with `system_`
- NO client context required (these happen outside user requests)
- Examples: `system_inventory_synced`, `system_cache_expired`, `system_email_processed`

### Examples

✅ **Correct**:
- `search_api_request_received` (user request cycle)
- `search_result_clicked` (frontend user action)
- `order_payment_completed` (request cycle)
- `product_cart_added` (user action)
- `system_inventory_synced` (background job, no user context)
- `system_cache_expired` (system event, no user context)

❌ **Incorrect**:
- `SearchAPIRequestReceived` (camelCase)
- `search_api_request_receive` (not past tense)
- `search-result-clicked` (kebab-case)
- `click_search_result` (action-first order)
- `search_updated` (use verb from controlled list: `modified` or `typed`)
- `inventory_synced` (missing `system_` prefix for non-request event)
```

**How agents use this**:
- Parse naming rules into regex patterns: `^[a-z]+(_[a-z]+)*_(received|clicked|completed|added|...)$`
- When generating instrumentation, validate event names against pattern
- Suggest corrections for non-compliant names found in codebase

---

### 2. Property Modeling

**Purpose**: Standardize property names, types, and formats across all events

**Format**:
```markdown
## Property Conventions

### Type Prefixes (REQUIRED)

Properties must use prefixes that indicate their type:

| Prefix | Type | Example |
|--------|------|---------|
| `is_`, `has_`, `should_` | Boolean | `is_prefetch`, `has_discount` |
| `num_` | Numeric count | `num_results`, `num_retries` |
| `total_` | Numeric sum/aggregate | `total_price`, `total_items` |
| _(none)_ | String/ID | `request_id`, `search_query` |
| `{name}_ms` | Millisecond duration | `query_time_ms`, `time_to_hydrate_ms` |
| `{name}_at` | Timestamp (ISO 8601) | `created_at`, `completed_at` |

### Core Required Properties by Event Type

#### A. Frontend Events (ALL frontend events)

```json
{
  // Universal properties
  "timestamp": "2026-02-17T10:00:00.250Z",  // ISO 8601 format
  "event_name": "search_result_clicked",

  // Request correlation
  "request_id": "abc-123",                   // Inherited from SSR or generated client-side
  "session_id": "session-789",               // User session identifier

  // User identification
  "user_id": "user-456",                     // Authenticated user ID (or null)
  "device_id": "device-123",                 // Persistent device identifier
  "cookie_id": "cookie-xyz",                 // Cookie-based identifier (fallback)

  // Client context
  "user_agent": "Mozilla/5.0 ...",           // Full user agent string
  "ip_address": "192.168.1.1",               // Client IP address (if available)

  // Page context (REQUIRED for frontend)
  "page": "/search",                         // Current page path
  "action": "result_click",                  // Specific action taken (snake_case)

  // Viewport context (REQUIRED for frontend)
  "viewport_width": 1920,
  "viewport_height": 1080,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 2.0
}
```

#### B. Backend Events (Request Cycle)

Backend events that occur during a user request cycle MUST receive client context from the requesting client:

```json
{
  // Universal properties
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "search_api_request_received",

  // Request correlation
  "request_id": "abc-123",
  "session_id": "session-789",

  // Client context blob (passed by client)
  "client_context": {
    "device_id": "device-123",
    "cookie_id": "cookie-xyz",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "192.168.1.1"
  },

  // User identification
  "user_id": "user-456",                     // From auth token

  // Backend-specific context
  "service": "search-service",
  "endpoint": "/api/search"
}
```

**Client Context Blob**: Clients MUST pass this via request headers:
```http
X-Request-ID: abc-123
X-Session-ID: session-789
X-Device-ID: device-123
X-Cookie-ID: cookie-xyz
X-Client-IP: 192.168.1.1
User-Agent: Mozilla/5.0 ...
```

Backend extracts these headers and constructs the `client_context` object.

#### C. Backend Events (System/Non-Request Cycle)

System events (prefixed with `system_`) that occur outside user request cycles:

```json
{
  // Universal properties
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "system_inventory_synced",

  // NO client context (not user-initiated)
  // NO request_id (not part of request cycle)

  // System context
  "service": "pricing-service",
  "job_id": "sync-job-456",
  "trigger": "scheduled"  // or "manual", "event-driven"
}
```

### Property Naming Rules

- **Format**: snake_case only
- **Consistency**: Same concept = same name across all events
  - ✅ Always use `request_id` (not `requestId`, `req_id`, `request_identifier`)
  - ✅ Always use `search_query` (not `query`, `search_term`, `q`)
- **Specificity**: Prefix generic names with context
  - ❌ `count` (ambiguous)
  - ✅ `results_count`, `items_count`, `retry_count`

### Examples

✅ **Correct Frontend Event**:
```json
{
  // Universal
  "timestamp": "2026-02-17T10:00:03.200Z",
  "event_name": "search_result_clicked",

  // Request correlation
  "request_id": "abc-123",
  "session_id": "session-789",

  // User identification
  "user_id": "user-456",
  "device_id": "device-123",
  "cookie_id": "cookie-xyz",

  // Client context
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
  "ip_address": "192.168.1.1",

  // Page context (frontend required)
  "page": "/search",
  "action": "result_click",

  // Viewport context (frontend required)
  "viewport_width": 1920,
  "viewport_height": 1080,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 2.0,

  // Event-specific properties
  "search_query": "laptop",
  "product_id": "xyz-789",
  "result_position": 2,
  "result_rank": 0.85
}
```

✅ **Correct Backend Request Cycle Event**:
```json
{
  // Universal
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "search_api_request_received",

  // Request correlation
  "request_id": "abc-123",
  "session_id": "session-789",

  // User identification
  "user_id": "user-456",

  // Client context blob (from headers)
  "client_context": {
    "device_id": "device-123",
    "cookie_id": "cookie-xyz",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "192.168.1.1"
  },

  // Backend context
  "service": "search-service",
  "endpoint": "/api/search",

  // Event-specific properties
  "search_query": "laptop",
  "is_prefetch": false,
  "num_filters": 2,
  "cache_key": "search:laptop:electronics"
}
```

✅ **Correct Backend System Event**:
```json
{
  // Universal
  "timestamp": "2026-02-17T03:00:00.000Z",
  "event_name": "system_inventory_synced",

  // NO client_context (not user-initiated)
  // NO request_id (not request cycle)

  // System context
  "service": "pricing-service",
  "job_id": "sync-job-456",
  "trigger": "scheduled",

  // Event-specific properties
  "num_products_synced": 1000,
  "sync_duration_ms": 45000,
  "is_success": true
}
```

❌ **Incorrect**:
```json
{
  "requestId": "abc-123",           // camelCase
  "query": "laptop",                // inconsistent naming
  "prefetch": false,                // missing is_ prefix
  "results": 47,                    // ambiguous (array or count?)
  "queryTime": 150,                 // missing _ms suffix
  "ts": "2026-02-17T10:00:00.250Z", // abbreviation
  "page": null                       // missing (required for frontend)
}
```
```

**How agents use this**:
- Parse type prefix rules into validation functions
- Check all properties against naming rules (snake_case, no abbreviations)
- Verify required properties present for user request cycle events
- Flag properties missing type prefixes or using inconsistent names

---

### 3. Event Versioning

**Purpose**: Handle breaking changes to event schemas without disrupting downstream consumers

**Format**:
```markdown
## Event Versioning

### Approach: Property-Based Versioning

**Rule**: Event versions are tracked via a `schema_version` property, NOT in the event name.

```json
{
  "event_name": "search_api_request_received",
  "schema_version": 2,
  "request_id": "abc-123",
  // ... other properties
}
```

### When to Increment Version

- **Breaking changes**: Removing properties, changing property types, renaming properties
- **Non-breaking changes**: Adding optional properties does NOT require version increment

### Version Migration

When introducing breaking changes:
1. Add `schema_version` property with incremented value
2. Support previous version for 2 quarters minimum
3. Document changes in `CHANGELOG.md` under `## Event Schema Changes`
4. Add deprecation warnings to analytics pipeline for old versions

### Examples

**v1 → v2 (Breaking change: renamed property)**:
```json
// v1 (deprecated)
{
  "event_name": "order_placed",
  "schema_version": 1,
  "order_total": 9999  // cents
}

// v2 (current)
{
  "event_name": "order_placed",
  "schema_version": 2,
  "total_price": 9999  // renamed, following total_ prefix convention
}
```

**Adding optional property (non-breaking)**:
```json
// Before
{
  "event_name": "search_result_clicked",
  "schema_version": 1,
  "product_id": "xyz-789"
}

// After (schema_version unchanged)
{
  "event_name": "search_result_clicked",
  "schema_version": 1,
  "product_id": "xyz-789",
  "result_rank": 0.85  // New optional property
}
```
```

**How agents use this**:
- When modifying existing events, check if changes are breaking
- If breaking, increment `schema_version` property
- Warn if removing properties without version increment
- Generate migration documentation for version bumps

---

### 4. Change Management

**Purpose**: Process for handling changes to instrumentation standards and event schemas

**Format**:
```markdown
## Change Management

### Proposing New Events

1. Open PR with event implementation
2. Add entry to `EVENT_CATALOG.md` with:
   - Event name
   - Description (when it fires)
   - All properties with types and descriptions
   - Example payload
3. PR must pass automated validation (see Validation section)
4. Requires approval from analytics team

### Modifying Existing Events

**Non-breaking changes** (adding optional properties):
- Standard PR review process
- Update `EVENT_CATALOG.md` with new properties
- No version change required

**Breaking changes** (removing/renaming properties):
- Requires `schema_version` increment
- Must document migration in `CHANGELOG.md`
- Support previous version for 2 quarters minimum
- Notify analytics team and downstream consumers

### Validation (PR Stage)

All PRs that add/modify analytics calls must pass:

**1. Naming validation**:
```bash
npm run validate:event-names
```
Checks:
- Event names follow `{object}_{action}` pattern
- Past tense only
- snake_case format

**2. Property validation**:
```bash
npm run validate:event-properties
```
Checks:
- All properties use snake_case
- Type prefixes present where required (`is_`, `num_`, etc.)
- Required core properties present for user request cycle events
- No abbreviations (e.g., `ts` → `timestamp`)

**3. Consistency validation**:
```bash
npm run validate:event-consistency
```
Checks:
- Same property names used consistently across events
- Property types consistent (e.g., `request_id` always string)

### Automated Testing

Tests run in CI/CD pipeline on every PR:

```typescript
// Example test structure
describe('Analytics Events', () => {
  it('should use correct naming convention', () => {
    const events = extractAnalyticsEvents('./src/**/*.ts');
    events.forEach(event => {
      expect(event.name).toMatch(/^[a-z]+(_[a-z]+)*_(received|clicked|completed|...)$/);
    });
  });

  it('should include required core properties for user request events', () => {
    const userRequestEvents = extractUserRequestEvents('./src/**/*.ts');
    userRequestEvents.forEach(event => {
      expect(event.properties).toHaveProperty('timestamp');
      expect(event.properties).toHaveProperty('event_name');
      expect(event.properties).toHaveProperty('request_id');
      expect(event.properties).toHaveProperty('user_id');
      // ... etc
    });
  });
});
```
```

**How agents use this**:
- Run validation scripts before committing generated instrumentation
- Check for breaking changes and increment versions if needed
- Update EVENT_CATALOG.md automatically with new event definitions
- Generate test files that validate new events against standards

---

## How Agents Use INSTRUMENTATION_STANDARDS.md

### 1. Parsing Phase

Agent reads `INSTRUMENTATION_STANDARDS.md` and extracts:
- Event naming pattern regex
- Property naming rules (snake_case, type prefixes)
- Required core properties list
- Versioning rules

**Implementation**:
```typescript
interface InstrumentationStandards {
  eventNaming: {
    pattern: RegExp;          // /^[a-z]+(_[a-z]+)*_(received|clicked|...)$/
    tense: 'past';
    format: 'snake_case';
  };
  propertyNaming: {
    format: 'snake_case';
    typePrefixes: {
      boolean: ['is_', 'has_', 'should_'],
      number: ['num_', 'total_'],
      duration: ['*_ms'],
      timestamp: ['*_at'],
    };
  };
  requiredCoreProperties: string[];  // ['timestamp', 'event_name', 'request_id', ...]
  versioning: {
    method: 'property';  // schema_version property
    breakingChangesRequireIncrement: true;
  };
}
```

### 2. Code Analysis Phase

Agent scans codebase for:
- Existing analytics calls (`analytics.track()`, `console.log('[Analytics]')`, etc.)
- Functions that should be instrumented (API endpoints, user interactions, state changes)

**Example** (analyzing search-controller.ts):
```typescript
// Agent detects this function should fire events
async search(req: Request, res: Response) {
  // START of function → should fire "received" event

  const results = await searchService.search(...);
  // After DB query → should fire "completed" event

  res.json(results);
  // Response sent → event already captured above
}
```

### 3. Event Generation Phase

Agent generates instrumentation code following standards:

**Input**: Function to instrument
```typescript
async createOrder(userId: string, items: CartItem[]) {
  const order = await db.orders.create({ userId, items });
  return order;
}
```

**Agent reasoning**:
1. Function creates an order → event name: `order_created` (from controlled verb list: "created")
2. This is a request cycle event (happens during user checkout flow)
3. Need client context blob from request headers
4. Need context properties: `order_id`, `num_items`, `total_price`
5. Apply type prefixes: `num_items` (count), `total_price` (sum)

**Generated code (Backend)**:
```typescript
async createOrder(userId: string, items: CartItem[], req: Request) {
  const order = await db.orders.create({ userId, items });

  analytics.track({
    name: 'order_created',
    properties: {
      // Universal properties
      timestamp: new Date().toISOString(),
      event_name: 'order_created',

      // Request correlation
      request_id: req.headers['x-request-id'],
      session_id: req.headers['x-session-id'],

      // User identification
      user_id: userId,

      // Client context blob (from client headers)
      client_context: {
        device_id: req.headers['x-device-id'],
        cookie_id: req.headers['x-cookie-id'],
        user_agent: req.headers['user-agent'],
        ip_address: req.ip || req.headers['x-forwarded-for'],
      },

      // Backend context
      service: 'core-api',
      endpoint: '/api/orders',

      // Event-specific properties
      order_id: order.id,
      num_items: items.length,
      total_price: order.total,
      payment_method: order.paymentMethod,

      schema_version: 1,
    },
  });

  return order;
}
```

**Example 2: Frontend Event**

**Input**: User clicks "Add to Cart" button
```typescript
function ProductCard({ product }: Props) {
  const handleAddToCart = () => {
    addToCart(product);
    // Need to track this click
  };
}
```

**Agent reasoning**:
1. User clicked button → event name: `product_cart_added` (from controlled verb: "clicked" or "added")
2. This is a frontend event → needs page, action, viewport properties
3. Need product context

**Generated code (Frontend)**:
```typescript
function ProductCard({ product }: Props) {
  const handleAddToCart = () => {
    addToCart(product);

    analytics.track({
      name: 'product_cart_added',
      properties: {
        // Universal properties
        timestamp: new Date().toISOString(),
        event_name: 'product_cart_added',

        // Request correlation
        request_id: window.__INITIAL_REQUEST_ID__,  // From SSR
        session_id: getSessionId(),

        // User identification
        user_id: currentUser?.id || null,
        device_id: getDeviceId(),
        cookie_id: getCookieId(),

        // Client context
        user_agent: navigator.userAgent,
        ip_address: null,  // Not available client-side

        // Page context (frontend required)
        page: window.location.pathname,
        action: 'add_to_cart_click',

        // Viewport context (frontend required)
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        device_pixel_ratio: window.devicePixelRatio,

        // Event-specific properties
        product_id: product.id,
        product_title: product.title,
        product_price: product.price,
        product_category: product.category,

        schema_version: 1,
      },
    });
  };
}
```

**Example 3: System Event (Non-Request Cycle)**

**Input**: Background job syncing inventory
```typescript
async function syncInventory() {
  const products = await fetchInventoryUpdates();
  await db.inventory.updateMany(products);
}
```

**Agent reasoning**:
1. Background job, not user-initiated → prefix with `system_`
2. Sync operation → use controlled verb: "synced"
3. Event name: `system_inventory_synced`
4. NO client context (not part of request cycle)
5. NO request_id (not tied to user request)

**Generated code (Backend System)**:
```typescript
async function syncInventory(jobId: string, trigger: 'scheduled' | 'manual') {
  const startTime = Date.now();
  const products = await fetchInventoryUpdates();
  await db.inventory.updateMany(products);

  analytics.track({
    name: 'system_inventory_synced',
    properties: {
      // Universal properties
      timestamp: new Date().toISOString(),
      event_name: 'system_inventory_synced',

      // NO client_context (not user-initiated)
      // NO request_id (not request cycle)

      // System context
      service: 'pricing-service',
      job_id: jobId,
      trigger,

      // Event-specific properties
      num_products_synced: products.length,
      sync_duration_ms: Date.now() - startTime,
      is_success: true,

      schema_version: 1,
    },
  });
}
```

### 4. Validation Phase

Agent validates generated code against standards:

```typescript
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

function validateEvent(event: AnalyticsEvent, context: 'frontend' | 'backend'): ValidationResult {
  const errors: string[] = [];
  const isSystemEvent = event.name.startsWith('system_');

  // 1. Check event name format and controlled verbs
  const namePattern = isSystemEvent
    ? /^system_[a-z]+(_[a-z]+)*_([a-z]+)$/
    : /^[a-z]+(_[a-z]+)*_([a-z]+)$/;

  if (!namePattern.test(event.name)) {
    errors.push(`Event name "${event.name}" doesn't match naming convention`);
  } else {
    // Extract verb (last word)
    const verb = event.name.split('_').pop();
    if (!CONTROLLED_VERBS.includes(verb)) {
      errors.push(`Event verb "${verb}" not in controlled vocabulary. Use one of: ${CONTROLLED_VERBS.join(', ')}`);
    }
  }

  // 2. Check required properties by event type
  if (context === 'frontend') {
    // Frontend events
    const requiredFrontend = [
      'timestamp', 'event_name', 'request_id', 'session_id',
      'user_id', 'device_id', 'cookie_id', 'user_agent',
      'page', 'action',  // Frontend-specific
      'viewport_width', 'viewport_height', 'screen_width', 'screen_height', 'device_pixel_ratio',
    ];
    requiredFrontend.forEach(prop => {
      if (event.properties[prop] === undefined) {
        errors.push(`Missing required frontend property: ${prop}`);
      }
    });
  } else if (context === 'backend' && !isSystemEvent) {
    // Backend request cycle events
    const requiredBackend = [
      'timestamp', 'event_name', 'request_id', 'session_id',
      'user_id', 'client_context', 'service', 'endpoint',
    ];
    requiredBackend.forEach(prop => {
      if (event.properties[prop] === undefined) {
        errors.push(`Missing required backend property: ${prop}`);
      }
    });

    // Validate client_context blob
    if (event.properties.client_context) {
      const requiredClientContext = ['device_id', 'cookie_id', 'user_agent', 'ip_address'];
      requiredClientContext.forEach(prop => {
        if (!event.properties.client_context[prop]) {
          errors.push(`Missing required client_context property: ${prop}`);
        }
      });
    }
  } else if (context === 'backend' && isSystemEvent) {
    // Backend system events
    const requiredSystem = ['timestamp', 'event_name', 'service', 'job_id', 'trigger'];
    requiredSystem.forEach(prop => {
      if (event.properties[prop] === undefined) {
        errors.push(`Missing required system event property: ${prop}`);
      }
    });

    // System events should NOT have request cycle properties
    if (event.properties.request_id) {
      errors.push('System events should not include request_id (not part of request cycle)');
    }
    if (event.properties.client_context) {
      errors.push('System events should not include client_context (not user-initiated)');
    }
  }

  // 3. Check property naming (snake_case, type prefixes)
  Object.keys(event.properties).forEach(key => {
    if (!/^[a-z]+(_[a-z]+)*$/.test(key)) {
      errors.push(`Property "${key}" not in snake_case`);
    }

    const value = event.properties[key];

    // Check type prefixes
    if (typeof value === 'boolean' && !key.match(/^(is|has|should)_/)) {
      errors.push(`Boolean property "${key}" missing type prefix (is_, has_, should_)`);
    }

    // Check numeric count prefix
    if (typeof value === 'number' && key.includes('count') && !key.match(/^(num_|total_)/)) {
      errors.push(`Numeric count property "${key}" should use num_ or total_ prefix`);
    }

    // Check duration suffix
    if (typeof value === 'number' && (key.includes('time') || key.includes('duration')) && !key.endsWith('_ms')) {
      errors.push(`Duration property "${key}" missing _ms suffix`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```
```

### 5. Documentation Generation Phase

Agent updates `EVENT_CATALOG.md`:

```markdown
## order_created

**When**: Fires when a new order is successfully created in the database

**Schema Version**: 1

**Properties**:
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| timestamp | string | ✅ | ISO 8601 timestamp |
| event_name | string | ✅ | Always "order_created" |
| request_id | string | ✅ | Unique request identifier |
| user_id | string | ✅ | ID of user who created order |
| device_id | string | ✅ | Device identifier or cookie ID |
| user_agent | string | ✅ | Browser/client user agent |
| ip_address | string | ✅ | Client IP address |
| order_id | string | ✅ | Created order's unique ID |
| num_items | number | ✅ | Number of items in order |
| total_price | number | ✅ | Order total in cents |

**Example**:
```json
{
  "timestamp": "2026-02-17T10:05:30.100Z",
  "event_name": "order_created",
  "request_id": "abc-123",
  "user_id": "user-456",
  "device_id": "device-789",
  "user_agent": "Mozilla/5.0 ...",
  "ip_address": "192.168.1.1",
  "order_id": "order-999",
  "num_items": 3,
  "total_price": 5999,
  "schema_version": 1
}
```
```

---

## Multi-Repo/Multi-Service Strategy

### Centralized Standards Repository

```
company-instrumentation-standards/
├── INSTRUMENTATION_STANDARDS.md     # Single source of truth
├── EVENT_CATALOG.md                 # All defined events
├── CHANGELOG.md                     # Version history
├── validation/
│   ├── validate-naming.js           # Reusable validation scripts
│   ├── validate-properties.js
│   └── validate-consistency.js
└── examples/
    ├── backend-event-example.ts
    ├── frontend-event-example.ts
    └── api-event-example.ts
```

### Integration per Repo

Each service/app repository includes:

```json
// package.json
{
  "scripts": {
    "validate:events": "node validate-events.js"
  },
  "devDependencies": {
    "@company/instrumentation-standards": "^1.0.0"  // Shared validation package
  }
}
```

```yaml
# .github/workflows/pr-validation.yml
name: Validate Instrumentation

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate event naming
        run: npm run validate:events
```

---

## Benefits of This Approach

1. **Language-agnostic**: Standards describe patterns, not implementations
2. **Scalable**: Works across unlimited repos/services
3. **Automated**: Validation runs in CI/CD, catches issues early
4. **Maintainable**: Guidelines, not full schemas—easier to keep updated
5. **Agent-friendly**: Clear rules that can be parsed and applied programmatically

---

## Next Steps

1. **Review this proposal**: Adjust naming rules, property conventions, versioning approach
2. **Create INSTRUMENTATION_STANDARDS.md**: Implement agreed-upon structure
3. **Build validation tooling**: Scripts that can run in CI/CD
4. **Test with agent**: Run auto-instrumentation on marketplace app
5. **Refine based on results**: Iterate on standards as we discover edge cases

---

## Decisions Made

✅ **Event vocabulary**: Controlled list of approved verbs implemented (see Naming Conventions section)
✅ **Frontend requirements**: Frontend events require `page`, `action`, and viewport properties
✅ **Backend client context**: Request cycle events receive client context blob via headers
✅ **System events**: Non-request cycle events use `system_` prefix and have no client context
✅ **Sampling rules**: Deferred (not needed for demo)

## Implementation Checklist

- [ ] Convert this proposal to `INSTRUMENTATION_STANDARDS.md`
- [ ] Create validation scripts (validate-naming.js, validate-properties.js, validate-consistency.js)
- [ ] Set up shared npm package `@company/instrumentation-standards`
- [ ] Add CI/CD integration example (GitHub Actions)
- [ ] Create `EVENT_CATALOG.md` template
- [ ] Test agent auto-instrumentation against marketplace app
- [ ] Document client header requirements for all client implementations

---

## Appendix: Client Header Implementation

### How Clients Pass Context to Backend

All clients (web, iOS, Android) must pass client context via HTTP headers on every API request.

#### Required Headers

```http
X-Request-ID: <uuid>          # Generated per-request (UUID v4)
X-Session-ID: <uuid>          # Persistent per session
X-Device-ID: <uuid>           # Persistent per device
X-Cookie-ID: <uuid>           # Browser cookie identifier (web only)
X-Client-IP: <ip-address>     # Client's IP address (if known)
User-Agent: <string>          # Standard User-Agent header
```

#### Web Client Example (Next.js)

```typescript
// lib/api-client.ts
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const headers = {
    'X-Request-ID': generateRequestId(),
    'X-Session-ID': getSessionId(),  // From localStorage
    'X-Device-ID': getDeviceId(),    // From localStorage
    'X-Cookie-ID': getCookieId(),    // From cookie
    'User-Agent': navigator.userAgent,
    ...options?.headers,
  };

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
```

#### iOS Client Example (Swift)

```swift
class APIClient {
    private let sessionId: String
    private let deviceId: String

    func request(_ endpoint: String) async throws -> Data {
        var request = URLRequest(url: URL(string: endpoint)!)
        request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Request-ID")
        request.setValue(sessionId, forHTTPHeaderField: "X-Session-ID")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-ID")
        request.setValue(UIDevice.current.identifierForVendor?.uuidString, forHTTPHeaderField: "X-Device-ID")

        let (data, _) = try await URLSession.shared.data(for: request)
        return data
    }
}
```

#### Backend Extraction Example (Express.js)

```typescript
// middleware/client-context.ts
export function extractClientContext(req: Request): ClientContext {
  return {
    device_id: req.headers['x-device-id'] as string,
    cookie_id: req.headers['x-cookie-id'] as string,
    user_agent: req.headers['user-agent'] as string,
    ip_address: (req.ip || req.headers['x-forwarded-for'] || req.headers['x-client-ip']) as string,
  };
}

// Usage in controller
analytics.track({
  name: 'search_api_request_received',
  properties: {
    // ...
    client_context: extractClientContext(req),
    // ...
  },
});
```

### Header Generation Utilities

Clients should use shared utilities to ensure consistent ID generation:

```typescript
// packages/shared/src/client-ids.ts
export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

export function getCookieId(): string {
  const cookies = document.cookie.split('; ');
  const cookieIdCookie = cookies.find(c => c.startsWith('cookie_id='));
  if (cookieIdCookie) {
    return cookieIdCookie.split('=')[1];
  }

  // Create new cookie_id
  const newCookieId = crypto.randomUUID();
  document.cookie = `cookie_id=${newCookieId}; path=/; max-age=31536000`; // 1 year
  return newCookieId;
}
```
