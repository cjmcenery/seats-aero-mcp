#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

const API_BASE = "https://seats.aero/partnerapi";

function getApiKey(): string {
  const key = process.env.SEATS_AERO_API_KEY;
  if (!key) {
    throw new Error(
      "SEATS_AERO_API_KEY environment variable is required. Get your API key from seats.aero Pro subscription."
    );
  }
  return key;
}

async function apiRequest(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<unknown> {
  const apiKey = getApiKey();

  let url = `${API_BASE}${path}`;

  if (params && method === "GET") {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Partner-Authorization": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`seats.aero API error ${response.status}: ${text}`);
  }

  return response.json();
}

const server = new McpServer({
  name: "seats-aero",
  version: "1.0.0",
});

// --- Tool: search_availability (Cached Search) ---
server.tool(
  "search_availability",
  `Search for cached award flight availability between airports. This searches seats.aero's cached data which is updated regularly. Returns availability with mileage costs across economy (Y), premium economy (W), business (J), and first (F) cabins.`,
  {
    origin_airport: z
      .string()
      .describe(
        'Origin airport code(s), comma-delimited for multiple (e.g. "SFO" or "SFO,LAX")'
      ),
    destination_airport: z
      .string()
      .describe(
        'Destination airport code(s), comma-delimited for multiple (e.g. "FRA" or "FRA,LHR")'
      ),
    start_date: z
      .string()
      .optional()
      .describe("Start date filter in YYYY-MM-DD format"),
    end_date: z
      .string()
      .optional()
      .describe("End date filter in YYYY-MM-DD format"),
    cabin: z
      .string()
      .optional()
      .describe(
        'Filter by cabin class(es), comma-delimited (e.g. "business" or "business,first"). Options: economy, premium, business, first'
      ),
    sources: z
      .string()
      .optional()
      .describe(
        'Filter by mileage program(s), comma-delimited (e.g. "united,aeroplan")'
      ),
    carriers: z
      .string()
      .optional()
      .describe(
        'Filter by carrier code(s), comma-delimited (e.g. "DL,AA")'
      ),
    only_direct_flights: z
      .boolean()
      .optional()
      .describe("Only return direct flights (default: false)"),
    include_trips: z
      .boolean()
      .optional()
      .describe(
        "Include flight-level trip details in the response (default: false)"
      ),
    order_by: z
      .string()
      .optional()
      .describe(
        'Sort order: "departure_date" (default) or "lowest_mileage" for cheapest first'
      ),
    take: z
      .number()
      .optional()
      .describe("Number of results per response (10-1000, default: 500)"),
    cursor: z
      .number()
      .optional()
      .describe("Pagination cursor from a previous search response"),
    skip: z
      .number()
      .optional()
      .describe("Number of results to skip"),
    include_filtered: z
      .boolean()
      .optional()
      .describe(
        "Include dynamically-priced results that are normally filtered out (default: false)"
      ),
    minify_trips: z
      .boolean()
      .optional()
      .describe("Return reduced trip fields for better performance"),
  },
  async ({ origin_airport, destination_airport, ...opts }) => {
    const data = await apiRequest("/search", {
      origin_airport,
      destination_airport,
      start_date: opts.start_date,
      end_date: opts.end_date,
      cabins: opts.cabin,
      sources: opts.sources,
      carriers: opts.carriers,
      only_direct_flights: opts.only_direct_flights,
      include_trips: opts.include_trips,
      order_by: opts.order_by,
      take: opts.take,
      cursor: opts.cursor,
      skip: opts.skip,
      include_filtered: opts.include_filtered,
      minify_trips: opts.minify_trips,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Tool: bulk_availability ---
server.tool(
  "bulk_availability",
  `Get bulk award availability data for a specific mileage program source. Returns all cached availability for the specified program, optionally filtered by cabin, dates, and regions.`,
  {
    source: z
      .string()
      .describe(
        'The mileage program to retrieve availability from (e.g. "united", "aeroplan", "delta")'
      ),
    cabin: z
      .string()
      .optional()
      .describe(
        "Filter by cabin type: economy, premium, business, or first"
      ),
    start_date: z
      .string()
      .optional()
      .describe("Start date filter in YYYY-MM-DD format"),
    end_date: z
      .string()
      .optional()
      .describe("End date filter in YYYY-MM-DD format"),
    origin_region: z
      .string()
      .optional()
      .describe(
        "Filter by origin region: North America, South America, Africa, Asia, Europe, Oceania"
      ),
    destination_region: z
      .string()
      .optional()
      .describe(
        "Filter by destination region: North America, South America, Africa, Asia, Europe, Oceania"
      ),
    take: z
      .number()
      .optional()
      .describe("Results per response (10-1000, default: 500)"),
    cursor: z
      .number()
      .optional()
      .describe("Pagination cursor from previous response"),
    skip: z
      .number()
      .optional()
      .describe("Number of results to skip (default: 0)"),
    include_filtered: z
      .boolean()
      .optional()
      .describe(
        "Include dynamically-priced filtered results (default: false)"
      ),
  },
  async ({ source, ...opts }) => {
    const data = await apiRequest("/availability", {
      source,
      cabin: opts.cabin,
      start_date: opts.start_date,
      end_date: opts.end_date,
      origin_region: opts.origin_region,
      destination_region: opts.destination_region,
      take: opts.take,
      cursor: opts.cursor,
      skip: opts.skip,
      include_filtered: opts.include_filtered,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Tool: get_trips ---
server.tool(
  "get_trips",
  `Get detailed flight-level trip information for a specific availability result. Returns individual flight segments, booking links, durations, mileage costs, and coordinates. Use the availability ID from search_availability or bulk_availability results.`,
  {
    availability_id: z
      .string()
      .describe(
        "The ID of the availability object (from search_availability or bulk_availability results)"
      ),
    include_filtered: z
      .boolean()
      .optional()
      .describe(
        "Include expensive dynamically-priced results that may have been filtered out (default: false)"
      ),
  },
  async ({ availability_id, include_filtered }) => {
    const data = await apiRequest(`/trips/${availability_id}`, {
      include_filtered,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Tool: get_routes ---
server.tool(
  "get_routes",
  `Get all available routes for a specific mileage program. Returns origin/destination airport pairs with their regions and distances. Useful for discovering what routes are tracked by seats.aero for a given program.`,
  {
    source: z
      .string()
      .describe(
        'The mileage program to get routes for (e.g. "united", "aeroplan", "delta")'
      ),
  },
  async ({ source }) => {
    const data = await apiRequest("/routes", { source });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Tool: live_search ---
server.tool(
  "live_search",
  `Perform a real-time live search for award availability. Unlike cached search, this queries the mileage program directly for up-to-the-minute results. More accurate but slower and uses more API quota. Returns detailed trip/segment information including mileage costs, taxes, and booking details.`,
  {
    origin_airport: z
      .string()
      .describe("Origin airport code (e.g. 'SFO')"),
    destination_airport: z
      .string()
      .describe("Destination airport code (e.g. 'NRT')"),
    departure_date: z
      .string()
      .describe("Departure date in YYYY-MM-DD format"),
    source: z
      .string()
      .describe(
        'Mileage program to search (e.g. "united", "aeroplan")'
      ),
    cabin: z
      .string()
      .optional()
      .describe("Filter results by cabin: economy, premium, business, or first"),
    seat_count: z
      .number()
      .optional()
      .describe("Number of adult passengers (1-9, default: 1)"),
    disable_filters: z
      .boolean()
      .optional()
      .describe(
        "Disable all filters for dynamic pricing and mismatched airports (default: false)"
      ),
    show_dynamic_pricing: z
      .boolean()
      .optional()
      .describe(
        "Disable only dynamic pricing filters but keep airport mismatch filters (default: false)"
      ),
  },
  async ({
    origin_airport,
    destination_airport,
    departure_date,
    source,
    cabin,
    seat_count,
    disable_filters,
    show_dynamic_pricing,
  }) => {
    const body: Record<string, unknown> = {
      origin_airport,
      destination_airport,
      departure_date,
      source,
    };
    if (cabin !== undefined) body.cabin = cabin;
    if (seat_count !== undefined) body.seat_count = seat_count;
    if (disable_filters !== undefined) body.disable_filters = disable_filters;
    if (show_dynamic_pricing !== undefined)
      body.show_dynamic_pricing = show_dynamic_pricing;

    const data = await apiRequest("/live", undefined, "POST", body);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("seats.aero MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
