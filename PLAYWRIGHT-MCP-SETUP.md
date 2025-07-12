# Playwright MCP Setup Guide

## ✅ Installation Complete

The Playwright MCP (Model Context Protocol) has been successfully installed and configured for your Claude Terminal in Cursor IDE.

## What Was Installed

- **Package**: `@playwright/mcp` (version 0.0.29)
- **Binary**: `mcp-server-playwright`
- **Location**: `/opt/homebrew/bin/mcp-server-playwright`

## Configuration

The MCP server has been added to your `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "mcp-server-playwright",
      "args": []
    }
  }
}
```

## What This Enables

Your Terminal AI can now:

1. **Open your web application** in a browser
2. **Take screenshots** of the current state
3. **Interact with elements** (click, type, scroll)
4. **Verify functionality** by checking for specific elements
5. **Generate visual reports** of what it sees
6. **Debug UI issues** by examining the rendered page
7. **Test responsive design** across different viewport sizes
8. **Automate user workflows** to verify features work

## How to Use

### For Your Terminal AI

Your Terminal AI can now use commands like:

- "Take a screenshot of my app running on localhost:5173"
- "Click the 'Add Dream' button and verify it opens the form"
- "Check if the authentication flow is working properly"
- "Test the responsive design on mobile viewport"
- "Verify that the dream entries are displaying correctly"

### Example Commands

```bash
# Your AI can now run these types of commands:
mcp-server-playwright --browser chrome --headless
# Then use the MCP protocol to control the browser
```

## Testing the Setup

1. **Start your development server**:
   ```bash
   cd dream-notions-app
   npm run dev
   ```

2. **Ask your Terminal AI** to test your application:
   - "Can you open my app and take a screenshot?"
   - "Please verify that the dream form is working correctly"
   - "Test the authentication flow and show me what happens"

## Advanced Configuration

You can customize the MCP server behavior by modifying the `args` in your settings:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "mcp-server-playwright",
      "args": [
        "--browser", "chrome",
        "--headless",
        "--viewport-size", "1280,720"
      ]
    }
  }
}
```

## Available Options

- `--browser <browser>`: chrome, firefox, webkit, msedge
- `--headless`: Run browser in headless mode
- `--viewport-size <size>`: Set viewport size (e.g., "1280,720")
- `--device <device>`: Emulate device (e.g., "iPhone 15")
- `--user-agent <ua>`: Set custom user agent
- `--save-trace`: Save Playwright trace for debugging

## Troubleshooting

If you encounter issues:

1. **Verify installation**:
   ```bash
   which mcp-server-playwright
   mcp-server-playwright --version
   ```

2. **Check permissions** in `.claude/settings.local.json`

3. **Restart Cursor IDE** to reload the MCP configuration

## Benefits for Your Workflow

- **Visual Feedback**: Your AI can see exactly what's rendered
- **Automated Testing**: Verify features work without manual intervention
- **Debugging**: Identify UI issues quickly
- **Documentation**: Generate screenshots for documentation
- **Quality Assurance**: Ensure consistent behavior across browsers

## Next Steps

1. Start your development server
2. Ask your Terminal AI to test your application
3. Use the visual feedback to improve your app
4. Automate testing workflows for new features

Your Terminal AI now has "eyes" to see your application and can provide much more accurate feedback and suggestions! 