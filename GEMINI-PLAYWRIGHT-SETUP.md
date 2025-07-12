# Gemini + Playwright Setup Guide

## ✅ Setup Complete

Since Gemini CLI doesn't have native MCP support like Claude, I've created a bridge solution that allows Gemini to analyze your web applications using Playwright.

## What Was Created

### 1. **Gemini Playwright Bridge Script**
- **File**: `gemini-playwright-bridge.js`
- **Purpose**: Captures screenshots and generates analysis reports
- **Dependencies**: Playwright (installed)

### 2. **How It Works**
1. Opens your web application in a browser
2. Takes screenshots (full page + viewport)
3. Extracts text content for analysis
4. Generates a JSON report with all findings
5. Saves everything to a `screenshots/` directory

## How to Use with Gemini

### Method 1: Direct Script Usage

```bash
# Capture screenshots of your app
node gemini-playwright-bridge.js http://localhost:5173

# Then ask Gemini to analyze the results
gemini screenshots/analysis-report.json
```

### Method 2: Ask Gemini to Run the Script

In Gemini, you can ask:

```
Please run the gemini-playwright-bridge.js script to capture screenshots of my web application at localhost:5173, then analyze the results and provide aesthetic recommendations.
```

### Method 3: Step-by-Step Analysis

1. **Capture screenshots**:
   ```bash
   node gemini-playwright-bridge.js http://localhost:5173
   ```

2. **Ask Gemini to analyze**:
   ```bash
   gemini screenshots/analysis-report.json screenshots/full-page.png screenshots/viewport.png
   ```

## Example Gemini Commands

### For Visual Analysis:
```
Please analyze the screenshots in the screenshots/ directory and provide detailed aesthetic recommendations for improving the visual design, layout, and user experience of my web application.
```

### For Performance Analysis:
```
Review the analysis report and screenshots, then suggest improvements for performance, accessibility, and user interface design.
```

### For Specific Features:
```
Examine the screenshots and report, then provide suggestions for improving the form design, navigation, and overall user flow.
```

## What Gemini Can Analyze

With this setup, Gemini can:

- ✅ **View screenshots** of your application
- ✅ **Read page content** from the analysis report
- ✅ **Analyze visual design** based on screenshots
- ✅ **Suggest improvements** for layout, colors, typography
- ✅ **Review accessibility** and user experience
- ✅ **Provide specific recommendations** for enhancement

## Files Generated

When you run the bridge script, it creates:

- `screenshots/full-page.png` - Complete page screenshot
- `screenshots/viewport.png` - Viewport-only screenshot
- `screenshots/analysis-report.json` - Detailed analysis data

## Advanced Usage

### Custom Analysis Scripts

You can create custom analysis scripts:

```javascript
// custom-analysis.js
const { captureAndAnalyze } = require('./gemini-playwright-bridge.js');

async function customAnalysis() {
  const report = await captureAndAnalyze('http://localhost:5173');
  
  // Add custom analysis logic here
  console.log('Custom analysis complete!');
}

customAnalysis();
```

### Batch Analysis

```bash
# Analyze multiple pages
node gemini-playwright-bridge.js http://localhost:5173
node gemini-playwright-bridge.js http://localhost:5173/dreams
node gemini-playwright-bridge.js http://localhost:5173/settings

# Then ask Gemini to analyze all results
gemini screenshots/
```

## Benefits for Your Workflow

- **Visual Feedback**: Gemini can see your actual application
- **Automated Capture**: No manual screenshot taking
- **Structured Analysis**: JSON reports for detailed review
- **Flexible Integration**: Works with Gemini's file analysis capabilities
- **Batch Processing**: Can analyze multiple pages at once

## Troubleshooting

### If the script fails:
1. **Check if your dev server is running**:
   ```bash
   cd dream-notions-app && npm run dev
   ```

2. **Verify Playwright installation**:
   ```bash
   npx playwright --version
   ```

3. **Check the output directory**:
   ```bash
   ls -la screenshots/
   ```

## Next Steps

1. **Start your development server**
2. **Run the bridge script**: `node gemini-playwright-bridge.js http://localhost:5173`
3. **Ask Gemini to analyze**: `gemini screenshots/`
4. **Implement the suggestions** based on Gemini's analysis

This bridge solution gives Gemini the ability to "see" your web application and provide visual feedback, similar to what we achieved with Claude's MCP integration! 