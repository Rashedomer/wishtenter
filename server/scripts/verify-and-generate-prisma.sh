#!/bin/bash
# Diagnose and fix "Unknown argument stripeSessionId" on production.
set -e
cd "$(dirname "$0")/.."

echo "=== 1. Check schema.prisma ==="
if grep -q 'stripeSessionId' prisma/schema.prisma; then
  echo "OK: stripeSessionId is in schema.prisma"
else
  echo "FAIL: stripeSessionId MISSING from schema.prisma"
  echo "Run: git pull origin main"
  exit 1
fi

echo ""
echo "=== 2. Regenerate Prisma client ==="
npx prisma generate

echo ""
echo "=== 3. Verify generated client ==="
if grep -rq 'stripeSessionId' node_modules/.prisma/client 2>/dev/null || \
   grep -rq 'stripeSessionId' node_modules/@prisma/client 2>/dev/null; then
  echo "OK: generated client includes stripeSessionId"
else
  echo "FAIL: client still missing stripeSessionId after generate"
  echo "Try: rm -rf node_modules/.prisma && npx prisma generate"
  exit 1
fi

echo ""
echo "=== Done. Now run: node scripts/sync-recent-tips.js daispin ==="
