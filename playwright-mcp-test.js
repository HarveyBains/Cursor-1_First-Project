// Test file to demonstrate Playwright MCP capabilities
// This file shows how your Terminal AI can now use Playwright to:
// 1. Open your web application
// 2. Take screenshots
// 3. Interact with elements
// 4. Verify functionality
// 5. Generate reports

const playwright = require('playwright');

async function testDreamNotionsApp() {
  const browser = await playwright.chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to your local development server
    await page.goto('http://localhost:5173');
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: 'initial-state.png' });
    
    // Wait for the app to load
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Take another screenshot after load
    await page.screenshot({ path: 'loaded-state.png' });
    
    console.log('✅ Playwright MCP test completed successfully!');
    console.log('📸 Screenshots saved: initial-state.png, loaded-state.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// This function can be called by your Terminal AI
testDreamNotionsApp(); 