// Test script for import without initial dashes

const testImportText = `# Dreams Journal Export
10/07/25 - First dream without leading dashes, Tags:#default
This is the description of the first dream.

---
10/07/25 - Second dream with dashes, Tags:#work
This is the second dream description.
---
10/07/25 - Third dream, Tags:Dreams/Activity/Personal
This is the third dream without trailing dashes.`;

// Simple test to validate the format parsing
const lines = testImportText.split('\n');
console.log('Testing import parser with no initial dashes...');
console.log('Total lines:', lines.length);
console.log('');

let dreamCount = 0;
lines.forEach((line, index) => {
  const trimmed = line.trim();
  if (trimmed.match(/^\d{2}\/\d{2}\/\d{2}\s*-\s*/)) {
    dreamCount++;
    console.log(`Dream ${dreamCount} found at line ${index + 1}: ${trimmed}`);
  }
});

console.log('');
console.log(`Expected to find 3 dreams, found ${dreamCount}`);