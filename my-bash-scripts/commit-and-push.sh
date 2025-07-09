#!/bin/bash

VERSION_FILE="$(dirname "$0")/version.txt"

# Initialize version if not present
if [ ! -f "$VERSION_FILE" ]; then
  echo "1.000" > "$VERSION_FILE"
fi

# Read and increment version
version=$(cat "$VERSION_FILE")
major=${version%%.*}
minor=${version##*.}
minor=$((10#$minor + 1))
if [ $minor -gt 999 ]; then
  major=$((major + 1))
  minor=0
fi
minor_padded=$(printf "%03d" $minor)
new_version="$major.$minor_padded"
echo "$new_version" > "$VERSION_FILE"

read -p "Enter a commit message: " msg

full_msg="v$new_version $msg"

# Remove git add . --quiet
# User will stage files manually before running this script
git add . --quiet
git commit -m "$full_msg" --quiet
git push --quiet
git log -7 --oneline 