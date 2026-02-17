# Instrumentation Workflow

## Overview

This repository maintains two versions of the marketplace application:
1. **Uninstrumented (main branch)** - Original clean codebase
2. **Instrumented (instrumented branch)** - Working copy with instrumentation added

The instrumented version can be reset at any time to start fresh from the uninstrumented baseline.

## Branch Strategy

```
main (branch)
  └─ v1.0-uninstrumented (tag) ← Frozen baseline
       │
       ├─ main branch (stays here - read-only)
       │
       └─ instrumented branch (work happens here)
```

### Branches

- **`main`** - Original uninstrumented codebase (protected/frozen)
- **`instrumented`** - Working branch for adding instrumentation

### Tag

- **`v1.0-uninstrumented`** - Frozen reference point (both branches point here initially)

## Workflow

### Initial Setup (Done)

```bash
# Already completed:
✅ git init
✅ git commit (baseline)
✅ git tag v1.0-uninstrumented
✅ git branch instrumented
```

### Working with Instrumentation

#### 1. Switch to Instrumented Branch

```bash
git checkout instrumented
```

#### 2. Add Your Instrumentation

Edit files to add instrumentation calls. For example:

```typescript
// services/search-service/src/controllers/search-controller.ts
import { analytics } from '@marketplace/shared';

async search(req: Request, res: Response) {
  const results = await searchService.search({...});

  // ✅ ADD INSTRUMENTATION
  analytics.track({
    name: 'search_performed',
    properties: {
      query: q,
      results: results.products.length,
      // ... more details
    }
  });

  res.json(results);
}
```

#### 3. Test Your Changes

```bash
# Rebuild affected services
docker compose build search-service
docker compose restart search-service

# Test the application
# Visit http://localhost:3000 and perform searches
```

#### 4. Commit Your Work (Optional)

```bash
git add -A
git commit -m "Add search instrumentation"
```

### Reset to Baseline (Start Fresh)

When you want to try a different instrumentation approach or start over:

```bash
# Option 1: Use the reset script (recommended)
./reset-instrumentation.sh

# Option 2: Manual reset
git checkout instrumented
git reset --hard v1.0-uninstrumented
```

This **completely erases** all changes on the instrumented branch and restores it to the original uninstrumented state.

### Compare Versions

```bash
# See what changed between uninstrumented and instrumented
git diff main instrumented

# See specific file differences
git diff main instrumented -- services/search-service/src/controllers/search-controller.ts
```

### View Uninstrumented Code

```bash
# Switch to main branch (read-only)
git checkout main

# Look at original files
cat services/search-service/src/controllers/search-controller.ts

# Switch back to instrumented
git checkout instrumented
```

## Common Workflows

### Scenario 1: Manual Instrumentation

```bash
# 1. Start on instrumented branch
git checkout instrumented

# 2. Edit files manually
code services/search-service/src/controllers/search-controller.ts
# Add analytics.track() calls

# 3. Test
docker compose build search-service
docker compose restart search-service

# 4. Commit (optional)
git commit -am "Add manual search tracking"

# 5. Start fresh if needed
./reset-instrumentation.sh
```

### Scenario 2: Automated Instrumentation Tool

```bash
# 1. Start fresh
./reset-instrumentation.sh

# 2. Run your auto-instrumentation tool
python auto_instrument.py --input . --output .

# 3. Review changes
git diff

# 4. Test
docker compose up -d

# 5. If not satisfied, reset and try again
./reset-instrumentation.sh
# Adjust your tool and re-run
```

### Scenario 3: Compare Approaches

```bash
# Try Approach A
./reset-instrumentation.sh
# ... add instrumentation ...
git commit -m "Approach A: Event-level tracking"
git branch instrumented-approach-a

# Try Approach B
./reset-instrumentation.sh
# ... add different instrumentation ...
git commit -m "Approach B: Trace-level tracking"
git branch instrumented-approach-b

# Compare both approaches
git diff instrumented-approach-a instrumented-approach-b
```

## File Structure

```
auto_instrumentation/
├── .git/
│   ├── refs/
│   │   ├── heads/
│   │   │   ├── main              ← Original uninstrumented
│   │   │   └── instrumented      ← Working copy for instrumentation
│   │   └── tags/
│   │       └── v1.0-uninstrumented  ← Frozen baseline
│
├── reset-instrumentation.sh      ← Reset script
├── INSTRUMENTATION_WORKFLOW.md   ← This file
│
├── services/
│   ├── core-api/
│   ├── search-service/           ← Example: Add instrumentation here
│   └── pricing-service/
│
└── apps/
    └── marketplace-web/
```

## Important Notes

### ✅ DO:
- Work on the `instrumented` branch
- Commit your instrumentation work
- Reset as many times as needed
- Create additional branches for different approaches
- Compare versions using `git diff`

### ❌ DON'T:
- Modify the `main` branch (keep it frozen)
- Delete the `v1.0-uninstrumented` tag
- Push changes without understanding what's being instrumented

## Quick Reference

```bash
# Switch between versions
git checkout main              # View uninstrumented version
git checkout instrumented      # Work on instrumented version

# Reset instrumented version
./reset-instrumentation.sh     # Start fresh

# See what changed
git diff main instrumented     # Compare all changes

# View commit history
git log --oneline --graph --all  # See all branches

# Check current branch
git branch                     # Shows current branch with *
```

## Reset Script Details

The `reset-instrumentation.sh` script:
1. Switches to the `instrumented` branch
2. Performs a hard reset to the `v1.0-uninstrumented` tag
3. Destroys all uncommitted and committed changes on that branch
4. Returns you to a clean slate

**Warning**: This is destructive! If you want to preserve your work, create a backup branch first:

```bash
git branch instrumented-backup    # Create backup
./reset-instrumentation.sh        # Safe to reset now
```

## Example: Adding Search Instrumentation

Let's walk through adding instrumentation to the search service:

```bash
# 1. Start on instrumented branch
git checkout instrumented

# 2. Edit the search controller
# File: services/search-service/src/controllers/search-controller.ts
# Add after line 42:

# analytics.track({
#   name: 'search_performed',
#   properties: {
#     query: q,
#     results_count: results.products.length,
#     total_matches: results.total,
#     product_ids: results.products.map(p => p.id)
#   }
# });

# 3. Rebuild and test
docker compose build search-service
docker compose restart search-service

# 4. Verify instrumentation works
# Open browser, perform search, check logs

# 5. Commit your work
git add services/search-service/src/controllers/search-controller.ts
git commit -m "Add search instrumentation with product details"

# 6. Try different approach? Reset!
./reset-instrumentation.sh
```

## Benefits of This Approach

✅ **Repeatable**: Reset anytime to try different instrumentation strategies
✅ **Comparable**: Use `git diff` to see exactly what changed
✅ **Safe**: Original codebase preserved on `main` branch
✅ **Flexible**: Create multiple instrumented branches for comparison
✅ **Automated**: Works well with auto-instrumentation tools
✅ **Testable**: Easy to test before/after behavior

## Next Steps

Now that the workflow is set up:

1. Switch to instrumented branch: `git checkout instrumented`
2. Add instrumentation to search service
3. Test the changes
4. Iterate using the reset script as needed

Happy instrumenting! 🎉
