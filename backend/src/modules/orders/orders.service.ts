import mongoose from 'mongoose';
import { OrderModel, IOrderItem } from '../../models/Order';
import { PharmacyModel } from '../../models/Pharmacy';
import { InventoryModel } from '../../models/Inventory';
import { NotificationModel } from '../../models/Notification';
import { ReceiptModel } from '../../models/Receipt';
import { SaleModel } from '../../models/Sale';
import { UserModel } from '../../models/User';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { logger } from '../../config/logger';

// ── Helper: generate receipt number ─────────────────────────────────────────
async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await ReceiptModel.countDocuments();
  const padded = String(count + 1).padStart(6, '0');
  return `REC-${year}-${padded}`;
}

export class OrdersService {
  // ─── Patient: Create order or visit request ─────────────────────────────────
  async create(
    userId: string,
    input: {
      pharmacy_id: string;
      type: 'order' | 'visit';
      items?: IOrderItem[];
      visit_date?: string;
      visit_time?: string;
      notes?: string;
    }
  ) {
    const pharmacy = await PharmacyModel.findById(input.pharmacy_id);
    if (!pharmacy) {
      throw Object.assign(new Error('Pharmacy not found'), { statusCode: 404 });
    }
    if (pharmacy.status !== 'approved') {
      throw Object.assign(new Error('Pharmacy is not accepting requests'), { statusCode: 422 });
    }

    // ── Inventory check for medicine orders ────────────────────────────────
    let outOfStockItems: string[] = [];
    let enrichedItems: IOrderItem[] = input.items ?? [];

    if (input.type === 'order' && input.items && input.items.length > 0) {
      const enriched: IOrderItem[] = [];

      for (const item of input.items) {
        if (!item.medicine_id) {
          enriched.push(item);
          continue;
        }

        const inv = await InventoryModel.findOne({
          pharmacy_id: new mongoose.Types.ObjectId(input.pharmacy_id),
          medicine_id: item.medicine_id,
        });

        if (!inv || inv.stock_quantity < item.quantity) {
          outOfStockItems.push(item.name);
        } else {
          enriched.push({
            ...item,
            price: inv.price,
          });
        }
      }

      enrichedItems = enriched;
    }

    // ── Auto-reject if any item is out of stock ────────────────────────────
    if (outOfStockItems.length > 0) {
      const reason = `The following medicine(s) are currently out of stock: ${outOfStockItems.join(', ')}.`;

      const order = await OrderModel.create({
        user_id: new mongoose.Types.ObjectId(userId),
        pharmacy_id: new mongoose.Types.ObjectId(input.pharmacy_id),
        type: input.type,
        items: enrichedItems,
        visit_date: input.visit_date ?? null,
        visit_time: input.visit_time ?? null,
        notes: input.notes ?? null,
        status: 'rejected',
        rejection_reason: reason,
        staff_comment: `We are sorry, but we are unable to fulfill your order at this time. ${reason} Please check back later or visit a nearby pharmacy.`,
      });

      // Notify patient about auto-rejection
      try {
        await NotificationModel.create({
          user_id: new mongoose.Types.ObjectId(userId),
          type: 'order_rejected',
          title: `${pharmacy.name}: Order Rejected`,
          body: `We apologize, but your order could not be fulfilled. ${reason}`,
          data: { order_id: order._id.toString(), pharmacy_id: input.pharmacy_id },
        });
      } catch (err) {
        logger.error({ err }, 'Failed to send auto-rejection notification');
      }

      return order.toObject();
    }

    // ── Create order (stock is available) ─────────────────────────────────
    const order = await OrderModel.create({
      user_id: new mongoose.Types.ObjectId(userId),
      pharmacy_id: new mongoose.Types.ObjectId(input.pharmacy_id),
      type: input.type,
      items: enrichedItems,
      visit_date: input.visit_date ?? null,
      visit_time: input.visit_time ?? null,
      notes: input.notes ?? null,
      status: 'pending',
    });

    // Notify pharmacy owner
    try {
      const label = input.type === 'visit' ? 'Visit Request' : 'Medicine Order';
      await NotificationModel.create({
        user_id: pharmacy.owner_id,
        type: input.type === 'visit' ? 'visit_request' : 'order_placed',
        title: `New ${label}`,
        body: `You have a new ${label.toLowerCase()} pending your response.`,
        data: { order_id: order._id.toString(), pharmacy_id: input.pharmacy_id },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to send order notification to pharmacy owner');
    }

    return order.toObject();
  }

  // ─── List orders (patient sees own, staff sees pharmacy's) ──────────────────
  async list(
    userId: string,
    userRole: string,
    params: {
      type?: string;
      status?: string;
      pharmacy_id?: string;
      page?: number | string;
      limit?: number | string;
    }
  ) {
    const { type, status, pharmacy_id } = params;
    const { page, limit } = parsePagination(params.page, params.limit);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (userRole === 'pharmacy_staff' || userRole === 'admin') {
      if (pharmacy_id) {
        filter.pharmacy_id = new mongoose.Types.ObjectId(pharmacy_id);
      } else {
        const pharmacy = await PharmacyModel.findOne({ owner_id: userId });
        if (pharmacy) filter.pharmacy_id = pharmacy._id;
      }
    } else {
      filter.user_id = new mongoose.Types.ObjectId(userId);
    }

    if (type) filter.type = type;
    if (status) filter.status = status;

    const data = await OrderModel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user_id', 'full_name email phone avatar_url')
      .populate('pharmacy_id', 'name address phone logo_url')
      .lean();

    const count = await OrderModel.countDocuments(filter);
    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  // ─── Get single order ────────────────────────────────────────────────────────
  async getById(userId: string, userRole: string, orderId: string) {
    const order = await OrderModel.findById(orderId)
      .populate('user_id', 'full_name email phone avatar_url')
      .populate('pharmacy_id', 'name address phone logo_url owner_id')
      .lean();

    if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    const pharmacy = order.pharmacy_id as any;
    const isOwner = (order.user_id as any)._id?.toString() === userId;
    const isStaff =
      (userRole === 'pharmacy_staff' || userRole === 'admin') &&
      pharmacy?.owner_id?.toString() === userId;

    if (!isOwner && !isStaff && userRole !== 'admin') {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }

    return order;
  }

  // ─── Staff: Respond to order/visit ──────────────────────────────────────────
  async respond(
    staffId: string,
    orderId: string,
    input: {
      action: 'approve' | 'reject' | 'complete' | 'cancel' | 'confirm_delivery' | 'reject_payment' | 'request_resubmission';
      rejection_reason?: string;
      staff_comment?: string;
      visit_date?: string;
      visit_time?: string;
      payment_bank_account?: string;
    }
  ) {
    const order = await OrderModel.findById(orderId).populate('pharmacy_id', 'owner_id name');
    if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    const pharmacy = order.pharmacy_id as any;
    if (pharmacy?.owner_id?.toString() !== staffId) {
      throw Object.assign(new Error('Only the pharmacy owner can respond to this order'), { statusCode: 403 });
    }

    // ── reject_payment: staff rejects the uploaded receipt screenshot ────────
    if (input.action === 'reject_payment') {
      if (order.status !== 'receipt_submitted') {
        throw Object.assign(
          new Error(`Cannot reject payment — no receipt has been submitted`),
          { statusCode: 422 }
        );
      }
      order.status = 'payment_rejected';
      order.staff_comment = input.staff_comment ?? 'Your payment receipt was rejected. Please contact the pharmacy.';
      order.responded_by = new mongoose.Types.ObjectId(staffId);
      await order.save();

      try {
        await NotificationModel.create({
          user_id: order.user_id,
          type: 'payment_rejected',
          title: `${pharmacy.name}: Payment Rejected`,
          body: order.staff_comment,
          data: { order_id: orderId },
        });
      } catch (err) {
        logger.error({ err }, 'Failed to notify patient about payment rejection');
      }

      return order.toObject();
    }

    // ── request_resubmission: staff requests a new receipt screenshot ────────
    if (input.action === 'request_resubmission') {
      if (order.status !== 'receipt_submitted' && order.status !== 'payment_rejected') {
        throw Object.assign(
          new Error(`Cannot request resubmission in current order state`),
          { statusCode: 422 }
        );
      }
      order.status = 'resubmission_required';
      order.staff_comment = input.staff_comment ?? 'Please re-upload a clearer image of your CBE payment receipt.';
      // Reset old receipt so customer must re-upload
      order.receipt_url = undefined;
      order.receipt_submitted_at = undefined;
      order.responded_by = new mongoose.Types.ObjectId(staffId);
      await order.save();

      try {
        await NotificationModel.create({
          user_id: order.user_id,
          type: 'resubmission_required',
          title: `${pharmacy.name}: Please Re-upload Receipt`,
          body: order.staff_comment,
          data: { order_id: orderId },
        });
      } catch (err) {
        logger.error({ err }, 'Failed to notify patient about resubmission request');
      }

      return order.toObject();
    }

    // ── confirm_delivery: staff confirms payment and approves delivery ───────
    if (input.action === 'confirm_delivery') {
      if (order.status !== 'receipt_submitted') {
        throw Object.assign(
          new Error(`Cannot confirm delivery — no receipt has been submitted yet`),
          { statusCode: 422 }
        );
      }
      order.status = 'completed';
      order.delivery_confirmed_at = new Date();
      if (input.staff_comment !== undefined) order.staff_comment = input.staff_comment;
      order.responded_by = new mongoose.Types.ObjectId(staffId);
      await order.save();

      // ── Auto-generate Receipt & Sale ──────────────────────────────────────
      try {
        const staffUser = await UserModel.findById(staffId).lean();
        const pharmacyDoc = await PharmacyModel.findById(order.pharmacy_id).lean();
        const patientUser = await UserModel.findById(order.user_id).lean();

        const items = (order.items ?? []).map(i => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price ?? 0,
        }));

        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const tax = parseFloat((subtotal * 0.15).toFixed(2));
        const total = parseFloat((subtotal + tax).toFixed(2));

        const receiptNo = await generateReceiptNumber();

        const receipt = await ReceiptModel.create({
          receipt_no: receiptNo,
          order_id: order._id,
          pharmacy_id: order.pharmacy_id,
          customer_name: (patientUser as any)?.full_name ?? 'Patient',
          date: new Date(),
          items,
          subtotal,
          tax,
          total,
          approved_by: (staffUser as any)?.full_name ?? 'Pharmacist',
        });

        // Create sale record
        const itemsSummary = items.map(i => `${i.name} (x${i.quantity})`).join(', ');
        await SaleModel.create({
          pharmacy_id: order.pharmacy_id,
          order_id: order._id,
          patient_name: (patientUser as any)?.full_name ?? 'Patient',
          items: itemsSummary,
          total,
          payment: 'Bank Transfer',
          staff_id: new mongoose.Types.ObjectId(staffId),
        });

        // Notify patient with receipt info
        const comment = order.staff_comment ? ` Message: "${order.staff_comment}"` : '';
        await NotificationModel.create({
          user_id: order.user_id,
          type: 'order_completed',
          title: `${pharmacy.name}: Delivery Approved! 🎉`,
          body: `Your payment was confirmed and your medicine is on its way. Receipt No: ${receiptNo}.${comment}`,
          data: { order_id: orderId, receipt_id: receipt._id.toString() },
        });
      } catch (err) {
        logger.error({ err }, 'Failed to generate receipt/sale or notify patient');
      }

      return order.toObject();
    }

    // ── Standard respond actions ───────────────────────────────────────────────
    if (!['pending', 'approved'].includes(order.status)) {
      throw Object.assign(
        new Error(`Cannot respond to an order with status '${order.status}'`),
        { statusCode: 422 }
      );
    }

    if (input.staff_comment !== undefined) {
      order.staff_comment = input.staff_comment;
    }

    if (input.action === 'approve') {
      // Medicine orders go to awaiting_receipt (payment required)
      // Visit requests go straight to approved
      if (order.type === 'order') {
        if (!input.payment_bank_account) {
          throw Object.assign(
            new Error('Bank account details are required when approving a medicine order'),
            { statusCode: 422 }
          );
        }

        // Deduct from inventory stock only if the status is transitioning from pending
        if (order.status === 'pending') {
          if (order.items && order.items.length > 0) {
            for (const item of order.items) {
              if (item.medicine_id) {
                await InventoryModel.updateOne(
                  {
                    pharmacy_id: order.pharmacy_id,
                    medicine_id: item.medicine_id,
                  },
                  {
                    $inc: { stock_quantity: -item.quantity },
                  }
                );
              }
            }
          }
        }

        order.status = 'awaiting_receipt';
        order.payment_bank_account = input.payment_bank_account;
      } else {
        order.status = 'approved';
        if (input.visit_date) order.visit_date = input.visit_date;
        if (input.visit_time) order.visit_time = input.visit_time;
      }
      order.approved_at = new Date();
      order.responded_by = new mongoose.Types.ObjectId(staffId);

    } else if (input.action === 'reject') {
      order.status = 'rejected';
      order.rejection_reason = input.rejection_reason ?? 'Not specified';
      if (!order.staff_comment) order.staff_comment = input.rejection_reason;
      order.responded_by = new mongoose.Types.ObjectId(staffId);

    } else if (input.action === 'complete') {
      order.status = 'completed';
    } else if (input.action === 'cancel') {
      order.status = 'cancelled';
    }

    await order.save();

    // Notify patient
    try {
      const label = order.type === 'visit' ? 'visit request' : 'medicine order';
      let bodyText = '';

      if (input.action === 'approve' && order.type === 'order') {
        // Calculate exact amount the customer must transfer
        const items = order.items ?? [];
        const subtotal = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
        const tax = parseFloat((subtotal * 0.15).toFixed(2));
        const total = parseFloat((subtotal + tax).toFixed(2));
        const amountLine = total > 0
          ? ` Amount to transfer: ${subtotal.toFixed(2)} ETB (subtotal) + ${tax.toFixed(2)} ETB (15% VAT) = ${total.toFixed(2)} ETB total.`
          : '';
        bodyText = `Your medicine order has been approved! Please transfer payment to: ${order.payment_bank_account}.${amountLine} Then upload your receipt screenshot in the app.`;
        if (order.staff_comment) bodyText += ` Note: ${order.staff_comment}`;
      } else if (input.action === 'approve' && order.type === 'visit' && order.visit_date) {
        bodyText = `Your visit has been approved for ${order.visit_date} at ${order.visit_time ?? 'a scheduled time'}.`;
        if (order.staff_comment) bodyText += ` Comment: ${order.staff_comment}`;
      } else if (input.action === 'reject') {
        bodyText = `Your ${label} was rejected. Reason: ${order.rejection_reason}`;
      } else {
        const statusLabel = input.action === 'approve' ? 'approved' : input.action;
        bodyText = `Your ${label} has been ${statusLabel}.`;
        if (order.staff_comment) bodyText += ` Comment: ${order.staff_comment}`;
      }

      await NotificationModel.create({
        user_id: order.user_id,
        type: `order_${input.action}`,
        title: `${pharmacy.name}: ${label} update`,
        body: bodyText,
        data: { order_id: orderId },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to notify patient about order response');
    }

    return order.toObject();
  }

  // ─── Patient: Submit receipt screenshot ─────────────────────────────────────
  async submitReceipt(userId: string, orderId: string, receipt_url: string) {
    const order = await OrderModel.findById(orderId).populate('pharmacy_id', 'owner_id name');
    if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    // Ownership check
    if (order.user_id.toString() !== userId) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }

    // Allow submission from awaiting_receipt OR resubmission_required
    if (order.status !== 'awaiting_receipt' && order.status !== 'resubmission_required') {
      throw Object.assign(
        new Error(`Cannot submit receipt — order status is '${order.status}'`),
        { statusCode: 422 }
      );
    }

    if (!receipt_url || receipt_url.trim() === '') {
      throw Object.assign(new Error('Receipt image is required'), { statusCode: 422 });
    }

    order.receipt_url = receipt_url;
    order.receipt_submitted_at = new Date();
    order.status = 'receipt_submitted';
    await order.save();

    // Notify pharmacy staff
    try {
      const pharmacy = order.pharmacy_id as any;
      await NotificationModel.create({
        user_id: pharmacy.owner_id,
        type: 'receipt_submitted',
        title: 'Payment Receipt Submitted',
        body: `A patient has submitted a payment receipt for their medicine order. Please review and confirm delivery.`,
        data: { order_id: orderId },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to notify staff about receipt submission');
    }

    return order.toObject();
  }
}
