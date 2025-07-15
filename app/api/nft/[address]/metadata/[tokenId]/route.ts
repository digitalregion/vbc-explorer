import { NextRequest, NextResponse } from 'next/server';
import Web3 from 'web3';

const GVBC_RPC_URL = 'http://localhost:8329';

// Web3 instance for blockchain interaction
const web3 = new Web3(GVBC_RPC_URL);

// Standard ERC721 ABI for tokenURI function
const ERC721_ABI = [
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "tokenURI", 
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Function to fetch NFT metadata from tokenURI
async function fetchNFTMetadata(tokenAddress: string, tokenId: number) {
  try {
    const contract = new web3.eth.Contract(ERC721_ABI, tokenAddress);
    
    // Get tokenURI from contract
    const tokenURI = await contract.methods.tokenURI(tokenId).call();
    
    if (!tokenURI || typeof tokenURI !== 'string') {
      return null;
    }

    // Handle different URI formats (HTTP, IPFS, data URLs)
    let metadataUrl = tokenURI;
    if (tokenURI.startsWith('ipfs://')) {
      // Convert IPFS URI to HTTP gateway
      metadataUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
    } else if (tokenURI.startsWith('data:application/json;base64,')) {
      // Handle base64 encoded JSON metadata
      const base64Data = tokenURI.split(',')[1];
      const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
      return JSON.parse(jsonString);
    }

    // Fetch metadata from URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(metadataUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'VirBiCoin-Explorer/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Failed to fetch metadata from ${metadataUrl}: ${response.status}`);
        return null;
      }

      const metadata = await response.json();
      
      // Ensure image URL is properly formatted
      if (metadata.image) {
        if (metadata.image.startsWith('ipfs://')) {
          metadata.image = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
      }

      return {
        name: metadata.name || `Token #${tokenId}`,
        description: metadata.description || '',
        image: metadata.image || '',
        attributes: metadata.attributes || [],
        tokenURI: tokenURI
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error(`Error fetching metadata for token ${tokenId}:`, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string; tokenId: string }> }
) {
  try {
    const { address, tokenId } = await params;
    
    if (!address || !tokenId) {
      return NextResponse.json(
        { error: 'Missing address or tokenId parameter' },
        { status: 400 }
      );
    }

    const tokenIdNum = parseInt(tokenId);
    if (isNaN(tokenIdNum)) {
      return NextResponse.json(
        { error: 'Invalid tokenId format' },
        { status: 400 }
      );
    }

    // Fetch metadata for the specific token
    let metadata = await fetchNFTMetadata(address, tokenIdNum);

    // If no metadata found from tokenURI, provide demo metadata for OSATO tokens
    if (!metadata && (
      address.toLowerCase() === '0xb8b5ecde83f13f8bcb0ed4ac3d8c41cb86e4cd4b' ||
      address.toLowerCase() === '0xd26488ea362005b023bc9f55157370c63c94d0c7'
    )) {
      // Sugar NFT collection has Token IDs 0-5, but images are available at 1-5
      // Map Token ID 0 to image 1, and Token IDs 1-5 to their respective images
      const imageId = tokenIdNum === 0 ? 1 : Math.min(tokenIdNum, 5);
      
      metadata = {
        name: `SugarNFT #${tokenIdNum}`,
        description: `This is SugarNFT token #${tokenIdNum} from the OSATO collection on VirBiCoin network. A unique digital collectible with special attributes.`,
        image: `https://sugar.digitalregion.jp/image/${imageId}.webp`, // Map to actual available images (1-5)
        attributes: [
          { trait_type: "Rarity", value: tokenIdNum <= 1 ? "Legendary" : tokenIdNum <= 2 ? "Rare" : tokenIdNum <= 4 ? "Uncommon" : "Common" },
          { trait_type: "Color", value: ["Gold", "Red", "Blue", "Green", "Yellow", "Purple"][tokenIdNum] || "Silver" },
          { trait_type: "Power", value: Math.floor(Math.random() * 100) + 1 },
          { trait_type: "Generation", value: "Gen 1" },
          { trait_type: "Token ID", value: tokenIdNum.toString() }
        ],
        tokenURI: `https://metadata.digitalregion.jp/sugar/${tokenIdNum}`
      };
    }

    if (!metadata) {
      return NextResponse.json(
        { error: 'Failed to fetch token metadata' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tokenId: tokenIdNum,
      address: address,
      metadata: metadata
    });
  } catch (error) {
    console.error('NFT metadata API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token metadata' },
      { status: 500 }
    );
  }
}
