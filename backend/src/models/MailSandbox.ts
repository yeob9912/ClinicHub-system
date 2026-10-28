import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMailSandbox extends Document {
  to: string;
  subject: string;
  body: string;
  reset_url?: string;
  created_at: Date;
}

const mailSandboxSchema = new Schema<IMailSandbox>(
  {
    to:         { type: String, required: true, lowercase: true, trim: true },
    subject:    { type: String, required: true },
    body:       { type: String, required: true },
    reset_url:  { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  }
);

mailSandboxSchema.index({ created_at: -1 });

export const MailSandboxModel: Model<IMailSandbox> =
  (mongoose.models.MailSandbox as Model<IMailSandbox>) || mongoose.model<IMailSandbox>('MailSandbox', mailSandboxSchema);
