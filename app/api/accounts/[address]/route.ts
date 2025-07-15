import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  
  // Redirect to the address API
  return NextResponse.redirect(new URL(`/api/address/${address}`, request.url));
}
