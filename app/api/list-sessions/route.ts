import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://api.heygen.com/v1/streaming.list", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
} 