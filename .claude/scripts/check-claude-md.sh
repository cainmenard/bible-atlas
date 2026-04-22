#!/bin/bash
# Check if this session added new components, lib files, or architectural changes
# that CLAUDE.md should reflect but doesn't.

CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)

if echo "$CHANGED_FILES" | grep -q "CLAUDE.md"; then
  exit 0
fi

NEEDS_UPDATE=false
REASONS=()

if echo "$CHANGED_FILES" | grep -qE "^src/components/.*\.tsx$"; then
  if git diff --name-status HEAD~1 HEAD | grep -qE "^A\s+src/components/.*\.tsx$"; then
    NEEDS_UPDATE=true
    REASONS+=("New component(s) added")
  fi
fi

if echo "$CHANGED_FILES" | grep -qE "^src/lib/.*\.ts$"; then
  if git diff --name-status HEAD~1 HEAD | grep -qE "^A\s+src/lib/.*\.ts$"; then
    NEEDS_UPDATE=true
    REASONS+=("New lib file(s) added")
  fi
fi

if [ "$NEEDS_UPDATE" = true ]; then
  echo "CLAUDE.md may need updating. Reasons:" >&2
  for r in "${REASONS[@]}"; do
    echo "  - $r" >&2
  done
  echo "Review the session's changes and update CLAUDE.md if the architecture or file structure changed meaningfully." >&2
  exit 2
fi

exit 0
