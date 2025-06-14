import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiKey = process.env.VOIDAI_API_KEY;
  try {
    const response = await fetch("https://api.voidai.app/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "chatgpt-4o-latest",
        stream: true,
        ...body,
      }),
    });
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 