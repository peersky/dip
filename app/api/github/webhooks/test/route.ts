import { NextResponse } from "next/server";

// Test endpoint for simulating GitHub webhooks during development
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Test endpoint only available in development" }, { status: 403 });
  }

  try {
    const { eventType, payload } = await request.json();

    console.log(`🧪 Testing webhook: ${eventType}`);

    // Forward to the actual webhook handler
    const webhookResponse = await fetch(`${request.url.replace("/test", "")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": eventType,
        "x-github-delivery": `test-${Date.now()}`,
        // Skip signature in development
      },
      body: JSON.stringify(payload),
    });

    const result = await webhookResponse.json();

    return NextResponse.json({
      message: "Test webhook processed",
      eventType,
      result,
    });
  } catch (error: any) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      {
        error: "Test webhook failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Test endpoint only available in development" }, { status: 403 });
  }

  return NextResponse.json({
    message: "GitHub webhook test endpoint",
    usage: "POST with { eventType, payload }",
    examples: {
      installation: {
        eventType: "installation",
        payload: {
          action: "created",
          installation: {
            id: 12345,
            account: { login: "testuser" },
            repository_selection: "selected",
          },
          sender: { login: "testuser" },
        },
      },
      pullRequest: {
        eventType: "pull_request",
        payload: {
          action: "opened",
          pull_request: {
            number: 123,
            title: "Test EIP: Example Improvement",
            user: { login: "testuser" },
            state: "open",
            merged: false,
          },
          repository: {
            name: "EIPs",
            full_name: "ethereum/EIPs",
          },
        },
      },
    },
  });
}
