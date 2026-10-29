import mongoose, { Document, Schema, Model } from 'mongoose';

export type OrderType = 'order' | 'visit';
export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'awaiting_receipt'
  | 'receipt_submitted'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'payment_rejected'
  | 'resubmission_required';

export interface IOrderItem {
  medicine_id?: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price?: number;
}

export interface IOrder extends Document {
  user_id: mongoose.Types.ObjectId;
  pharmacy_id: mongoose.Types.ObjectId;
  type: OrderType;
  status: OrderStatus;
  items: IOrderItem[];
  visit_date?: string;
  visit_time?: string;
  notes?: string;
  rejection_reason?: string;
  staff_comment?: string;
  // Payment flow fields
  payment_bank_account?: string;   // bank details staff sends on approval
  receipt_url?: string;            // base64 screenshot the user uploads
  receipt_submitted_at?: Date;     // when user uploaded the receipt
  delivery_confirmed_at?: Date;    // when staff confirmed delivery
  approved_at?: Date;
  responded_by?: mongoose.Types.ObjectId;
  is_delivery?: boolean;
  delivery_fee?: number;
  delivery_address?: string;
  subtotal?: number;
  total_price?: number;
  created_at: Date;
  updated_at: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    medicine_id: { type: Schema.Types.ObjectId, ref: 'Medicine', default: null },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user_id:                { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pharmacy_id:            { type: Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    type:                   { type: String, enum: ['order', 'visit'], required: true },
    status:                 {
      type: String,
      enum: ['pending', 'approved', 'awaiting_receipt', 'receipt_submitted', 'rejected', 'completed', 'cancelled', 'payment_rejected', 'resubmission_required'],
      default: 'pending',
    },
    items:                  { type: [orderItemSchema], default: [] },
    visit_date:             { type: String, default: null },
    visit_time:             { type: String, default: null },
    notes:                  { type: String, default: null },
    rejection_reason:       { type: String, default: null },
    staff_comment:          { type: String, default: null },
    payment_bank_account:   { type: String, default: null },
    receipt_url:            { type: String, default: null },
    receipt_submitted_at:   { type: Date, default: null },
    delivery_confirmed_at:  { type: Date, default: null },
    approved_at:            { type: Date, default: null },
    responded_by:           { type: Schema.Types.ObjectId, ref: 'User', default: null },
    is_delivery:            { type: Boolean, default: false },
    delivery_fee:           { type: Number, default: 0 },
    delivery_address:       { type: String, default: null },
    subtotal:               { type: Number, default: 0 },
    total_price:            { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

orderSchema.index({ user_id: 1, created_at: -1 });
orderSchema.index({ pharmacy_id: 1, status: 1, created_at: -1 });

export const OrderModel: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', orderSchema);
