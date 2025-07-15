import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txhash: string }> }
) {
  const { txhash } = await params;
  
  // Redirect to the tx API
  return NextResponse.redirect(new URL(`/api/tx/${txhash}`, request.url));
}
