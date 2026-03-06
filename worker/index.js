const CACHE_TTL_SECONDS = 300; // 5 minutes

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/spaces") {
      return handleSpaces(env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleSpaces(env) {
  // Check KV cache first
  const cached = await env.SPACES_KV.get("spaces", { type: "text" });
  if (cached) {
    return jsonResponse(cached);
  }

  // Fetch fresh data from Google Apps Script
  const gasResponse = await fetch(env.GAS_URL);
  if (!gasResponse.ok) {
    return new Response("Failed to fetch spaces", { status: 502, headers: corsHeaders() });
  }

  const body = await gasResponse.text();

  // Cache for TTL
  await env.SPACES_KV.put("spaces", body, { expirationTtl: CACHE_TTL_SECONDS });

  return jsonResponse(body);
}

function jsonResponse(body) {
  return new Response(body, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
