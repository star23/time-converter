#!/usr/bin/env bash
# Auto-increment patch version in manifest.json and popup.html on each commit.
# Used as a git pre-commit hook.

set -e

MANIFEST="manifest.json"

# Only bump if manifest.json or source files are staged
STAGED=$(git diff --cached --name-only)
# Skip if only the hook itself or non-source files changed
if ! echo "$STAGED" | grep -qE '\.(js|json|html|css)$'; then
  exit 0
fi

# Read current version
CURRENT=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' "$MANIFEST")
if [ -z "$CURRENT" ]; then
  echo "Could not read version from $MANIFEST"
  exit 1
fi

# Split and increment patch
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update manifest.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST"

# Update popup.html footer
sed -i "s/Time Zone Converter v[0-9]\+\.[0-9]\+\(\.[0-9]\+\)\?/Time Zone Converter v$NEW_VERSION/" popup.html 2>/dev/null || true

# Stage the updated files
git add "$MANIFEST" popup.html 2>/dev/null || true

echo "Version bumped: $CURRENT -> $NEW_VERSION"
