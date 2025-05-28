import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { username, token } = await request.json();

    let userData;

    if (token) {
      // Use provided token to get authenticated user info
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DIP-Platform/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      userData = await response.json();
    } else if (username) {
      // Use public API to get user info by username
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DIP-Platform/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      userData = await response.json();
    } else {
      return NextResponse.json({ error: "Either username or token is required" }, { status: 400 });
    }

    // Return standardized user data
    const standardizedUser = {
      login: userData.login,
      id: userData.id,
      avatar_url: userData.avatar_url,
      name: userData.name || userData.login,
      email: userData.email,
      bio: userData.bio,
      company: userData.company,
      location: userData.location,
      public_repos: userData.public_repos,
      followers: userData.followers,
      following: userData.following,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    };

    return NextResponse.json({
      success: true,
      user: standardizedUser,
    });
  } catch (error) {
    console.error("Failed to fetch GitHub user:", error);
    return NextResponse.json({ error: "Failed to fetch user information" }, { status: 500 });
  }
}
