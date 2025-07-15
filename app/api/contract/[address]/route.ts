import { NextRequest, NextResponse } from 'next/server';
import { Contract } from '@/lib/models';
import { connectToDatabase } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    await connectToDatabase();
    
    const address = params.address.toLowerCase();
    const doc = await Contract.findOne({ address }).lean(true);
    
    if (!doc || !doc.sourceCode) {
      return NextResponse.json({ valid: false });
    }
    
    const data = { ...doc, valid: true };
    return NextResponse.json(data);
    
  } catch (err) {
    console.error(`ContractFind error: ${err}`);
    console.error(`bad address: ${params.address}`);
    return NextResponse.json({ error: true, valid: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const contract = await request.json();
    
    await Contract.updateOne(
      { address: contract.address },
      { $setOnInsert: contract },
      { upsert: true }
    );
    
    return NextResponse.json({ success: true });
    
  } catch (err) {
    console.error(`ContractAdd error: ${err}`);
    return NextResponse.json({ error: true }, { status: 500 });
  }
} 