import { NextResponse } from "next/server";

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL as string | undefined;

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Tambahkan cache-busting parameter jika ada
  const gasUrl = GAS_URL ? (url.searchParams.has('t') ? `${GAS_URL}?t=${url.searchParams.get('t')}` : GAS_URL) : undefined;
  
  if (!gasUrl) {
    return NextResponse.json(
      { success: false, message: "Backend URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(gasUrl, { 
      method: "GET", 
      cache: "no-store",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    // Set headers untuk mencegah cache
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to contact backend",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  
  if (!GAS_URL) {
    return NextResponse.json(
      { success: false, message: "Backend URL is not configured" },
      { status: 500 }
    );
  }

  try {
    // Parse body untuk logging (jika valid JSON)
    let parsedBody = null;
    try {
      parsedBody = JSON.parse(body);
      console.log('API Route - Sending to GAS:', JSON.stringify(parsedBody));
    } catch {
      console.log('API Route - Body is not JSON:', body);
    }

    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body,
      cache: "no-store",
    });
    
    const data = await res.json();
    console.log('API Route - Response from GAS:', JSON.stringify(data));
    
    const response = NextResponse.json(data, { status: res.status });
    // Set headers untuk mencegah cache
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('API Route - Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to contact backend",
      },
      { status: 500 }
    );
  }
}
