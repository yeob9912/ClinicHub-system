import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'pharmacy_approved'
  | 'pharmacy_rejected'
  | 'system'
  | 'price_change'
  | 'back_in_stock';

export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, required: true },
    title:    { type: String, required: true },
    body:     { type: String, required: true },
    data:     { type: Schema.Types.Mixed, default: {} },
    is_read:  { type: Boolean, default: false },
    read_at:  { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

export const NotificationModel =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
