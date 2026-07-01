import mongoose from 'mongoose';
import { CallModel } from '../../models/Call';
import { UserModel } from '../../models/User';

export class CallsService {

  async initiateCall(callerId: string, input: { recipient_id: string; pharmacy_id?: string; type?: 'video' | 'audio' }) {
    const { recipient_id, pharmacy_id, type = 'video' } = input;

    // Validate recipient
    const recipient = await UserModel.findById(recipient_id);
    if (!recipient) {
      throw Object.assign(new Error('Recipient not found'), { statusCode: 404 });
    }
    if (callerId === recipient_id) {
      throw Object.assign(new Error('Cannot call yourself'), { statusCode: 400 });
    }

    // End any existing active call by this caller
    await CallModel.updateMany(
      { caller_id: callerId, status: { $in: ['ringing', 'accepted'] } },
      { $set: { status: 'ended', ended_at: new Date() } }
    );

    const call = await CallModel.create({
      caller_id:    new mongoose.Types.ObjectId(callerId),
      recipient_id: new mongoose.Types.ObjectId(recipient_id),
      pharmacy_id:  pharmacy_id ? new mongoose.Types.ObjectId(pharmacy_id) : null,
      type,
      status: 'ringing',
    });

    return call.toObject();
  }

  async getActiveCall(userId: string) {
    const call = await CallModel.findOne({
      $or: [
        { caller_id:    new mongoose.Types.ObjectId(userId), status: { $in: ['ringing', 'accepted'] } },
        { recipient_id: new mongoose.Types.ObjectId(userId), status: { $in: ['ringing', 'accepted'] } },
      ],
    })
      .populate('caller_id',    'full_name avatar_url')
      .populate('recipient_id', 'full_name avatar_url')
      .lean();

    return call ?? null;
  }

  async respondToCall(callId: string, userId: string, action: 'accept' | 'reject') {
    const call = await CallModel.findById(callId);
    if (!call) {
      throw Object.assign(new Error('Call not found'), { statusCode: 404 });
    }
    if (call.recipient_id.toString() !== userId) {
      throw Object.assign(new Error('Not authorised to respond to this call'), { statusCode: 403 });
    }
    if (call.status !== 'ringing') {
      throw Object.assign(new Error(`Call is already ${call.status}`), { statusCode: 422 });
    }

    call.status = action === 'accept' ? 'accepted' : 'rejected';
    if (action === 'accept') call.started_at = new Date();
    await call.save();

    return call.toObject();
  }

  async endCall(callId: string, userId: string) {
    const call = await CallModel.findById(callId);
    if (!call) {
      throw Object.assign(new Error('Call not found'), { statusCode: 404 });
    }

    const isParticipant =
      call.caller_id.toString() === userId ||
      call.recipient_id.toString() === userId;

    if (!isParticipant) {
      throw Object.assign(new Error('Not a participant of this call'), { statusCode: 403 });
    }

    call.status   = 'ended';
    call.ended_at = new Date();
    if (call.started_at) {
      call.duration_seconds = Math.floor((call.ended_at.getTime() - call.started_at.getTime()) / 1000);
    }
    await call.save();

    return call.toObject();
  }
}
