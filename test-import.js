// Test script for the updated import parser

const testImportText = `# Dreams Journal Export
10/07/25 - Me , Dad & Keith, Tags:#default

---
10/07/25 - Working at a warehouse, Tags:#default
I imagine that I was working out a warehouse hours given a walkie talkie this team leader or something one of the other workers asked how much it got paid for carrying the Walkie talkie I told him and the guy of the lad wooden pressed
I could see myself looking at about the same way I do when I'm at the working at the royal Mail five seven cargo web pants big boots walkie talkie sticking out the side
---
10/07/25 - Going to NLW depot in Canoe, Tags:Dreams/Activity/Work
I was at NLW depot, the depot was done, I was in the building and one of the girls came down to finish. I was in the yard a and moved of with doing the 15mins driving checks. Do I picked up drying fringekment.  In the dream I imagine seeing big Al to give me off for the infringement.
In the dream I imagined wearing a office white and blue stripe shirt with a tire carafe loosely unburdened and I thought I was just too smart for this job and dress-wise.
Before getting to the new to the world of depo I imagine myself being in a canoe on the road and using some strange battle of sticks to Romeo alongside of the road I was doing this to get fit`;

// Simple test to validate the format parsing
const lines = testImportText.split('\n');
console.log('Testing import parser with sample text...');
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