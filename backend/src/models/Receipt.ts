import mongoose, { Document, Schema } from 'mongoose';

export interface IReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface IReceipt extends Document {
  receipt_no: string;            // e.g. REC-2026-000001
  order_id: mongoose.Types.ObjectId;
  pharmacy_id: mongoose.Types.ObjectId;
  customer_name: string;
  date: Date;
  items: IReceiptItem[];
  subtotal: number;
  tax: number;                   // 15% of subtotal
  total: number;
  approved_by: string;           // pharmacist/staff full name
  created_at: Date;
  updated_at: Date;
}

const receiptItemSchema = new Schema<IReceiptItem>(
  {
    name:     { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price:    { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const receiptSchema = new Schema<IReceipt>(
  {
    receipt_no:    { type: String, required: true, unique: true },
    order_id:      { type: Schema.Types.ObjectId, ref: 'Order',    required: true, unique: true },
    pharmacy_id:   { type: Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    customer_name: { type: String, default: 'Patient' },
    date:          { type: Date, default: Date.now },
    items:         { type: [receiptItemSchema], default: [] },
    subtotal:      { type: Number, required: true, min: 0 },
    tax:           { type: Number, required: true, min: 0 },
    total:         { type: Number, required: true, min: 0 },
    approved_by:   { type: String, default: 'Pharmacist' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

receiptSchema.index({ pharmacy_id: 1, created_at: -1 });

export const ReceiptModel =
  mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', receiptSchema);
