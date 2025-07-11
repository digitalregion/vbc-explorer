import mongoose from 'mongoose';

const TokenSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  holders: { type: Number, required: true },
  supply: { type: String, required: true },
  type: { type: String, required: true },
}, { collection: 'tokens' });

export default mongoose.models.Token || mongoose.model('Token', TokenSchema);
