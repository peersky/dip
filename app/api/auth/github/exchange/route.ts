import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing GitHub OAuth configuration");
      return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 500 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.json(
        {
          error: `GitHub OAuth error: ${tokenData.error_description || tokenData.error}`,
        },
        { status: 400 }
      );
    }

    if (!tokenData.access_token) {
      return NextResponse.json({ error: "No access token received from GitHub" }, { status: 400 });
    }

    // Verify the token by getting user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: "Failed to verify GitHub token" }, { status: 400 });
    }

    const userData = await userResponse.json();

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      user: {
        login: userData.login,
        id: userData.id,
        avatar_url: userData.avatar_url,
        name: userData.name,
        email: userData.email,
      },
    });
  } catch (error) {
    console.error("GitHub OAuth exchange error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "GitHub OAuth token exchange endpoint. Use POST with authorization code.",
  });
}
