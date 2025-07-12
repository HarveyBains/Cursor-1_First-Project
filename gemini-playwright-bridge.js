#!/usr/bin/env node

// Gemini Playwright Bridge
// This script can be used with Gemini to capture and analyze web applications

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureAndAnalyze(url, outputDir = './screenshots') {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Take full page screenshot
    const screenshotPath = path.join(outputDir, 'full-page.png');
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Get page content for analysis
    const title = await page.title();
    const currentUrl = page.url();
    
    // Extract text content for analysis
    const textContent = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    // Get viewport screenshot
    const viewportPath = path.join(outputDir, 'viewport.png');
    await page.screenshot({ path: viewportPath });
    console.log(`📸 Viewport screenshot saved: ${viewportPath}`);
    
    // Generate analysis report
    const report = {
      url: currentUrl,
      title: title,
      screenshots: [screenshotPath, viewportPath],
      textContent: textContent.substring(0, 1000) + '...', // Truncated for analysis
      timestamp: new Date().toISOString()
    };
    
    const reportPath = path.join(outputDir, 'analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Analysis report saved: ${reportPath}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// CLI usage
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:5173';
  const outputDir = process.argv[3] || './screenshots';
  
  console.log(`🎯 Gemini Playwright Bridge`);
  console.log(`📱 Target URL: ${url}`);
  console.log(`📁 Output Directory: ${outputDir}`);
  
  captureAndAnalyze(url, outputDir)
    .then(report => {
      console.log('\n✅ Analysis complete!');
      console.log(`📊 Report: ${report.screenshots[1]}`);
      console.log(`📄 Full report: ${outputDir}/analysis-report.json`);
    })
    .catch(error => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { captureAndAnalyze }; 