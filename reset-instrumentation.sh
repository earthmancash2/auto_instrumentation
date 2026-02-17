#!/bin/bash
# Reset Instrumentation Script
# This script resets the instrumented branch to the original uninstrumented baseline

set -e

echo "🔄 Resetting instrumented branch to baseline..."

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)

# Switch to instrumented branch
echo "📍 Switching to instrumented branch..."
git checkout instrumented

# Hard reset to baseline tag
echo "♻️  Resetting to v1.0-uninstrumented tag..."
git reset --hard v1.0-uninstrumented

echo ""
echo "✅ Instrumented branch reset complete!"
echo ""
echo "📊 Current status:"
git log --oneline -1
echo ""
echo "📝 Next steps:"
echo "   1. You are now on the 'instrumented' branch"
echo "   2. Add your instrumentation code"
echo "   3. Test your changes"
echo "   4. Run this script again to reset and try a different approach"
echo ""
echo "💡 To switch back to main (uninstrumented): git checkout main"
echo ""
