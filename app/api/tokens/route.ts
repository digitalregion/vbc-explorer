import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import Token from '../../../models/Token';

export async function GET() {
  await connectToDatabase();
  const tokens = await Token.find({});
  return NextResponse.json({ tokens });
}
