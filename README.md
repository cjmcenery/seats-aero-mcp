# seats-aero-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for the [seats.aero](https://seats.aero) Partner API. Lets AI assistants like Claude search for award flight availability in real time.

> **Requires a seats.aero Pro subscription** to get an API key.

## Tools

| Tool | Description |
|------|-------------|
| `search_availability` | Search cached award availability between airports across all cabins and programs |
| `bulk_availability` | Get all cached availability for a specific mileage program |
| `get_trips` | Get detailed flight segments for a specific availability result |
| `get_routes` | List all routes tracked by seats.aero for a given mileage program |
| `live_search` | Real-time search querying the mileage program directly (slower, uses more quota) |

## Setup

### 1. Install dependencies and build

```bash
npm install
npm run build
```

### 2. Configure your API key

Get your API key from your [seats.aero](https://seats.aero) Pro account.

Set it as an environment variable:

```bash
export SEATS_AERO_API_KEY=your_api_key_here
```

Or create a `.env` file (copy from `.env.example`).

### 3. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seats-aero": {
      "command": "node",
      "args": ["/absolute/path/to/seats-aero-mcp/dist/index.js"],
      "env": {
        "SEATS_AERO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the seats.aero tools available.

## Usage examples

Once connected, you can ask Claude things like:

- *"Find business class award availability from SFO to Tokyo in June"*
- *"Search for United miles availability from LAX to London next month"*
- *"What routes does Aeroplan track from North America to Europe?"*
- *"Do a live search for ANA first class from JFK to NRT on 2025-08-15 using United miles"*

## Development

```bash
npm run build   # compile TypeScript
npm start       # run the server
```

## License

MIT
