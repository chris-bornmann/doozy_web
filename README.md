# doozy_web
Web client for Doozy.

# Install Claude...
...

# Install the Tailwind MCP server so Claude can see the browser.
claude mcp add playwright npx @playwright/mcp@latest
Open .claude/settings.local.json.  Set "allow" to "mcp__playwright".

# To Run
* npm run dev
* VITE_API_BASE_URL=http://100.104.51.111:8000 npm run dev --dd -- --host
