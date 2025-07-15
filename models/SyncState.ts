import mongoose from 'mongoose';

interface ISyncState extends mongoose.Document {
  scannerName: string;
  lastScannedBlock: number;
}

const SyncStateSchema = new mongoose.Schema({
  scannerName: {
    type: String,
    required: true,
    unique: true,
    default: 'tokenScanner',
  },
  lastScannedBlock: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  timestamps: true,
  collection: 'syncstates',
});

// Ensure index for faster lookups
SyncStateSchema.index({ scannerName: 1 });

const SyncState = mongoose.model<ISyncState>('SyncState', SyncStateSchema);

export default SyncState;
