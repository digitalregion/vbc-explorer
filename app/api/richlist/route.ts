// Richlist API for VirBiCoin Explorer
import { NextResponse } from 'next/server';
import { connectDB, Account } from '../../../models/index';

export async function GET(request: Request) {
  try {
    // Ensure database connection
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Get richlist sorted by balance
    const richlist = await Account.find(
      { balance: { $gt: 0 } }, // Only accounts with positive balance
      { address: 1, balance: 1, type: 1, blockNumber: 1 }
    )
      .sort({ balance: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Account.countDocuments({ balance: { $gt: 0 } });

    // Calculate some statistics
    const totalSupply = await Account.aggregate([
      { $match: { balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    const contractCount = await Account.countDocuments({ type: 1, balance: { $gt: 0 } });
    const walletCount = await Account.countDocuments({ type: 0, balance: { $gt: 0 } });

    // Format the response
    const formattedRichlist = richlist.map((account, index) => ({
      rank: skip + index + 1,
      address: account.address,
      balance: account.balance,
      balanceFormatted: `${account.balance.toFixed(4)} VBC`,
      type: account.type === 1 ? 'Contract' : 'Wallet',
      percentage: totalSupply.length > 0 ?
        ((account.balance / totalSupply[0].total) * 100).toFixed(4) : '0.0000',
      lastUpdated: account.blockNumber
    }));

    return NextResponse.json({
      richlist: formattedRichlist,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      statistics: {
        totalSupply: totalSupply.length > 0 ? totalSupply[0].total : 0,
        totalAccounts: totalCount,
        contractAccounts: contractCount,
        walletAccounts: walletCount
      }
    });

  } catch (error) {
    console.error('Error in richlist API:', error);
    return NextResponse.json({
      richlist: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      statistics: {
        totalSupply: 0,
        totalAccounts: 0,
        contractAccounts: 0,
        walletAccounts: 0
      },
      error: 'Failed to fetch richlist data'
    });
  }
}
