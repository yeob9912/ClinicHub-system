import mongoose, { Document, Schema } from 'mongoose';

export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
export type CallType   = 'video' | 'audio';

export interface ICall extends Document {
  caller_id:    mongoose.Types.ObjectId;
  recipient_id: mongoose.Types.ObjectId;
  pharmacy_id?: mongoose.Types.ObjectId;
  type:         CallType;
  status:       CallStatus;
  started_at?:  Date;
  ended_at?:    Date;
  duration_seconds?: number;
  created_at:   Date;
  updated_at:   Date;
}

const callSchema = new Schema<ICall>(
  {
    caller_id:        { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    recipient_id:     { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    pharmacy_id:      { type: Schema.Types.ObjectId, ref: 'Pharmacy', default: null  },
    type:             { type: String, enum: ['video', 'audio'], default: 'video' },
    status:           { type: String, enum: ['ringing', 'accepted', 'rejected', 'ended', 'missed'], default: 'ringing' },
    started_at:       { type: Date, default: null },
    ended_at:         { type: Date, default: null },
    duration_seconds: { type: Number, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

callSchema.index({ caller_id: 1, status: 1 });
callSchema.index({ recipient_id: 1, status: 1 });

export const CallModel =
  mongoose.models.Call || mongoose.model<ICall>('Call', callSchema);
