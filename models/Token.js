import mongoose from 'mongoose';

const TokenSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true, lowercase: true },
  holders: { type: Number, required: true, default: 0 },
  supply: { type: String, required: true, default: '0' },
  type: { type: String, required: true },
  decimals: { type: Number },
  totalSupply: { type: String },
}, { collection: 'tokens', timestamps: true });

export default mongoose.models.Token || mongoose.model('Token', TokenSchema);
