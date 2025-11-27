import { NextResponse } from "next/server";

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL as string | undefined;

export async function GET() {
  if (!GAS_URL) {
    return NextResponse.json(
      { success: false, message: "Backend URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(GAS_URL, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to fetch reports" 
      },
      { status: 500 }
    );
  }
}
