import { NextResponse } from "next/server";

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL as string | undefined;

export async function POST(request: Request) {
  if (!GAS_URL) {
    return NextResponse.json(
      { success: false, message: "Backend URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
