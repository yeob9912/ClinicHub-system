import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender_id: mongoose.Types.ObjectId;
  recipient_id: mongoose.Types.ObjectId;
  pharmacy_id: mongoose.Types.ObjectId;
  message: string;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender_id:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pharmacy_id:  { type: Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    message:      { type: String, required: true, trim: true },
    is_read:      { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

messageSchema.index({ pharmacy_id: 1, sender_id: 1, created_at: -1 });
messageSchema.index({ recipient_id: 1, is_read: 1 });

export const MessageModel =
  mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
