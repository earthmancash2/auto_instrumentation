# Instrumentation Standards Revision Summary

**Date**: 2026-02-17
**Branch**: ssr-instrumentation
**Commit**: 3bd4d56

---

## What Changed

### Core Insight

**Problem**: Mixing user actions (clicked, viewed) with system lifecycle stages (received, hydrated, completed) in a single "controlled verb" list was semantically confusing.

**Solution**: Separate event naming patterns based on who/what is acting:
1. **User actions** → `{object}_{user_action}` (verbs: clicked, viewed, typed)
2. **Request cycle stages** → `{object}_request_{stage}` or `{object}_{stage}` (stages: received, completed, rendered, hydration)
3. **System stages** → `system_{object}_{stage}` (stages: synced, processed, indexed)

---

## Event Naming Patterns

### 1. User Action Events

**Pattern**: `{object}_{user_action}`

**When**: User performs an action

**Verbs** (controlled list):
- `clicked` - User clicked/tapped
- `viewed` - User viewed content
- `typed` - User entered text
- `submitted` - User submitted form
- `selected` - User made selection
- `scrolled` - User scrolled
- `expanded` - User expanded content
- `collapsed` - User collapsed content
- `toggled` - User toggled setting

**Examples**:
```
search_result_clicked
product_viewed
form_submitted
search_query_typed
filter_selected
```

---

### 2. Request Cycle Events

**Pattern**: `{object}_request_{stage}` (backend) or `{object}_{stage}` (frontend)

**When**: System lifecycle stages during request processing

**Stages**:

**Backend**:
- `received` - Server received request
- `started` - Long-running operation started
- `completed` - Operation completed successfully
- `failed` - Operation failed

**Frontend**:
- `rendered` - SSR render completed
- `hydration` - Client hydration completed
- `interactive` - Fully interactive

**Resource**:
- `created` - Resource created
- `updated` - Resource modified
- `deleted` - Resource removed
- `validated` - Validation occurred

**Examples**:
```
# Backend
search_request_received
search_request_completed
order_request_failed
payment_request_started

# Frontend
search_page_rendered
search_page_hydration
product_page_interactive

# Resource
user_account_created
product_inventory_updated
```

---

### 3. System/Background Events

**Pattern**: `system_{object}_{stage}`

**When**: Background jobs, cron tasks, system processes (not part of user request cycle)

**Stages**:
- `processed` - Background processing
- `synced` - Data synchronization
- `indexed` - Index updated
- `expired` - Expiration occurred
- `scheduled` - Task scheduled

**Examples**:
```
system_inventory_synced
system_cache_expired
system_email_processed
system_search_indexed
```

---

## Naming Decision Tree

```
Is this a user action?
├─ YES → {object}_{user_action}
│         Verb from user action list
│         Example: search_result_clicked
│
└─ NO → Is this part of a request cycle?
    ├─ YES → {object}_request_{stage} or {object}_{stage}
    │         Stage from request stage list
    │         Example: search_request_received
    │
    └─ NO → Is this a background/system event?
        └─ YES → system_{object}_{stage}
                  Stage from system stage list
                  Example: system_inventory_synced
```

---

## Event Name Changes

### SSR Instrumentation Events

| Old Name | New Name | Category | Change Reason |
|----------|----------|----------|---------------|
| `search_api_request_received` | `search_request_received` | Request cycle | Removed "api", simplified pattern |
| `search_api_request_completed` | `search_request_completed` | Request cycle | Removed "api", simplified pattern |
| `search_api_request_failed` | `search_request_failed` | Request cycle | Removed "api", simplified pattern |
| `search_page_hydrated` | `search_page_hydration` | Request cycle (frontend) | "hydrated" is past tense verb, "hydration" is stage noun |
| `search_query_modified` | `search_query_typed` | User action | "modified" not in list, "typed" is user action |
| `search_result_clicked` | `search_result_clicked` ✅ | User action | No change needed |

---

## Files Updated

### 1. INSTRUMENTATION_STANDARDS.md

**Changes**:
- Split controlled vocabulary into three lists (user actions, request stages, system stages)
- Added event category descriptions with patterns
- Added naming decision tree
- Updated all examples
- Added comprehensive stage tables

**Before** (single list):
```markdown
### Controlled Verb List
- clicked (user action)
- received (backend action)
- hydrated (system action)
```

**After** (three separate lists):
```markdown
### Controlled User Action Verbs
- clicked, viewed, typed, ...

### Request Stage List
- Backend: received, started, completed, failed
- Frontend: rendered, hydration, interactive
- Resource: created, updated, deleted, validated

### System Stage List
- processed, synced, indexed, expired, scheduled
```

---

### 2. scripts/validate-naming.js

**Changes**:
- Split `CONTROLLED_VERBS` into `USER_ACTION_VERBS`, `REQUEST_STAGES`, `SYSTEM_STAGES`
- Rewrote `validateEventName()` function to check category-specific patterns:
  1. Check if system event → validate against system stages
  2. Check if request cycle event → validate against request stages
  3. Otherwise → validate against user action verbs
- Improved error messages to indicate which list/pattern to use

**Before**:
```javascript
const CONTROLLED_VERBS = ['clicked', 'received', 'hydrated', ...];

function validateEventName(eventName) {
  const verb = eventName.split('_').pop();
  if (!CONTROLLED_VERBS.includes(verb)) {
    errors.push('Verb not in controlled list');
  }
}
```

**After**:
```javascript
const USER_ACTION_VERBS = ['clicked', 'viewed', 'typed', ...];
const REQUEST_STAGES = { backend: ['received', ...], frontend: ['rendered', 'hydration', ...] };
const SYSTEM_STAGES = ['synced', 'processed', ...];

function validateEventName(eventName) {
  if (eventName.startsWith('system_')) {
    // Validate against SYSTEM_STAGES
  } else if (eventName.includes('_request_') || isRequestStage(lastPart)) {
    // Validate against REQUEST_STAGES
  } else {
    // Validate against USER_ACTION_VERBS
  }
}
```

---

### 3. EVENT_CATALOG.md

**Changes**:
- Added quick reference table at top showing all event patterns
- Updated all event names to new convention
- Added "Event Category" field to each event definition
- Added "Pattern" explanation showing which pattern was used

**Example before**:
```markdown
#### search_api_request_received

**When**: Fires when the search service receives a search request
**Location**: services/search-service/src/controllers/search-controller.ts:65
**Schema Version**: 1
```

**Example after**:
```markdown
#### search_request_received

**When**: Fires when the search service receives a search request
**Event Category**: Request Cycle Event
**Pattern**: `{object}_request_{stage}` where object=search, stage=received
**Location**: services/search-service/src/controllers/search-controller.ts:65
**Schema Version**: 1
```

---

### 4. VALIDATION_REPORT.md (New)

**Purpose**: Shows current state of SSR instrumentation against new standards

**Contents**:
- Summary of what passes/fails validation
- Detailed property validation
- Required updates for full compliance
- 5-phase implementation plan
- Breaking change assessment
- Migration path with schema versioning

---

## Benefits of New Approach

### 1. Semantic Clarity

**Before**: "hydrated" - Who hydrated? User? System? Unclear.
**After**: `search_page_hydration` - Clear it's a system stage, not user action.

### 2. Query Simplicity

```sql
-- Get all user actions
SELECT * FROM events
WHERE event_name NOT LIKE '%_request_%'
  AND event_name NOT LIKE 'system_%';

-- Get all request lifecycle events
SELECT * FROM events
WHERE event_name LIKE '%_request_%'
   OR event_name LIKE '%_rendered'
   OR event_name LIKE '%_hydration';

-- Get all background jobs
SELECT * FROM events
WHERE event_name LIKE 'system_%';
```

### 3. Validation Precision

Different rules for different categories:
- User actions: Must use controlled verbs
- Request cycle: Must use request stages
- System: Must use system_ prefix + system stages

### 4. Agent Implementation

```python
# Agent decision logic
if is_user_action(code):
    event_name = f"{object}_{user_action_verb}"
    validate_against(USER_ACTION_VERBS)

elif is_request_handler(code):
    event_name = f"{object}_request_{stage}"
    validate_against(REQUEST_STAGES)

elif is_background_job(code):
    event_name = f"system_{object}_{stage}"
    validate_against(SYSTEM_STAGES)
```

---

## Validation Status

### Current SSR Instrumentation

**Passes**:
- ✅ `search_result_clicked` - User action (no changes needed)

**Needs Name Updates**:
- ❌ `search_api_request_received` → `search_request_received`
- ❌ `search_api_request_completed` → `search_request_completed`
- ❌ `search_api_request_failed` → `search_request_failed`
- ❌ `search_page_hydrated` → `search_page_hydration`
- ❌ `search_query_modified` → `search_query_typed`

**Also Needs**:
- ❌ Backend: client_context blob, service, endpoint properties
- ❌ Frontend: session_id, device_id, cookie_id, page, action, screen dimensions

See VALIDATION_REPORT.md for complete details.

---

## Next Steps

### 1. Run Validation (Current State)

```bash
npm run validate:event-names
```

Expected result: ❌ 5 events fail naming validation

### 2. Update Event Names in Code

**Backend** (`services/search-service/src/controllers/search-controller.ts`):
```typescript
// Change these:
analytics.track({ name: 'search_api_request_received', ... });
analytics.track({ name: 'search_api_request_completed', ... });
analytics.track({ name: 'search_api_request_failed', ... });

// To these:
analytics.track({ name: 'search_request_received', ... });
analytics.track({ name: 'search_request_completed', ... });
analytics.track({ name: 'search_request_failed', ... });
```

**Frontend** (`apps/marketplace-web/src/pages/search.tsx`):
```typescript
// Change these:
analytics.track({ name: 'search_page_hydrated', ... });
analytics.track({ name: 'search_query_modified', ... });

// To these:
analytics.track({ name: 'search_page_hydration', ... });
analytics.track({ name: 'search_query_typed', ... });
```

### 3. Add Missing Properties

Follow VALIDATION_REPORT.md section "Required Updates Summary"

### 4. Update Schema Version

Bump to `schema_version: 2` since event names are changing (breaking change)

### 5. Re-run Validation

```bash
npm run validate:events
```

Expected result: ✅ All validations pass

---

## Migration Path

### For Downstream Consumers

1. **Support both v1 and v2** for 2 quarters:
   ```sql
   -- Old events (v1)
   WHERE event_name = 'search_api_request_received'
      OR event_name = 'search_request_received'
   ```

2. **Update queries** to use v2 names:
   ```sql
   -- New events (v2 only)
   WHERE event_name = 'search_request_received'
     AND schema_version = 2
   ```

3. **Deprecate v1** after 2 quarters

### For Analytics Pipeline

1. Create view that aliases old → new names
2. Gradually migrate dashboards/queries
3. Monitor usage of v1 events
4. Remove v1 support after grace period

---

## Summary

✅ **Completed**:
- Revised naming convention to separate user actions from request stages
- Updated INSTRUMENTATION_STANDARDS.md with three event categories
- Updated validation scripts to check category-specific patterns
- Updated EVENT_CATALOG.md with new names and patterns
- Created VALIDATION_REPORT.md showing current compliance
- Committed and pushed to GitHub

🚧 **Next** (optional):
- Update actual SSR instrumentation code with new event names
- Add missing properties (client_context, etc.)
- Run validation to confirm 100% compliance

---

**View on GitHub**: https://github.com/earthmancash2/auto_instrumentation/tree/ssr-instrumentation

**Key Files**:
- [INSTRUMENTATION_STANDARDS.md](https://github.com/earthmancash2/auto_instrumentation/blob/ssr-instrumentation/INSTRUMENTATION_STANDARDS.md)
- [VALIDATION_REPORT.md](https://github.com/earthmancash2/auto_instrumentation/blob/ssr-instrumentation/VALIDATION_REPORT.md)
- [EVENT_CATALOG.md](https://github.com/earthmancash2/auto_instrumentation/blob/ssr-instrumentation/EVENT_CATALOG.md)
