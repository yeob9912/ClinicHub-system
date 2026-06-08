import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintStatus = 'New' | 'Under Review' | 'Resolved' | 'Closed';
export type ComplaintPriority = 'High' | 'Medium' | 'Low' | null;
export type ComplaintCategory = 'Location Issue' | 'Service Issue' | 'Medicine Availability' | 'General Feedback' | 'Other';

export interface IComplaint extends Document {
  user_id: mongoose.Types.ObjectId;
  pharmacy_name: string;
  issue: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  admin_response?: string | null;
  responded_by?: mongoose.Types.ObjectId | null;
  responded_at?: Date | null;
  attachments_count: number;
  created_at: Date;
  updated_at: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    user_id:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pharmacy_name:  { type: String, required: true, trim: true },
    issue:          { type: String, required: true },
    description:    { type: String, required: true },
    category:       {
      type: String,
      enum: ['Location Issue', 'Service Issue', 'Medicine Availability', 'General Feedback', 'Other'],
      default: 'Other',
    },
    status:           { type: String, enum: ['New', 'Under Review', 'Resolved', 'Closed'], default: 'New' },
    priority:         { type: String, enum: ['High', 'Medium', 'Low', null], default: null },
    admin_response:   { type: String, default: null },
    responded_by:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
    responded_at:     { type: Date, default: null },
    attachments_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

complaintSchema.index({ user_id: 1, created_at: -1 });
complaintSchema.index({ status: 1, created_at: -1 });

export const ComplaintModel =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', complaintSchema);
