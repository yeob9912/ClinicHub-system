import mongoose, { Document, Schema } from 'mongoose';

export interface IWatchlist extends Document {
  user_id: mongoose.Types.ObjectId;
  medicine_id: mongoose.Types.ObjectId;
  pharmacy_id?: mongoose.Types.ObjectId | null;
  notify_price_change: boolean;
  notify_back_in_stock: boolean;
  target_price?: number | null;
  created_at: Date;
  updated_at: Date;
}

const watchlistSchema = new Schema<IWatchlist>(
  {
    user_id:              { type: Schema.Types.ObjectId, ref: 'User', required: true },
    medicine_id:          { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    pharmacy_id:          { type: Schema.Types.ObjectId, ref: 'Pharmacy', default: null },
    notify_price_change:  { type: Boolean, default: true },
    notify_back_in_stock: { type: Boolean, default: true },
    target_price:         { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// Prevent duplicate watchlist entries (user+medicine+pharmacy combo)
watchlistSchema.index({ user_id: 1, medicine_id: 1, pharmacy_id: 1 }, { unique: true });

export const WatchlistModel =
  mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', watchlistSchema);
