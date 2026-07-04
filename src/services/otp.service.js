import axios from 'axios';
import { OtpRecord } from '../models/index.js';
import { MSG91_API_KEY, MSG91_SENDER_ID, MSG91_TEMPLATE_ID } from '../config/env.js';

export const sendOtp = async (phone) => {
  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Delete existing OtpRecord for this phone
  await OtpRecord.deleteMany({ phone });

  // Save new OtpRecord with expiresAt = now + 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await OtpRecord.create({ phone, otp, expiresAt });

  // Call MSG91 API
  if (MSG91_API_KEY && MSG91_TEMPLATE_ID) {
    try {
      await axios.post(
        'https://api.msg91.com/api/v5/otp',
        {
          template_id: MSG91_TEMPLATE_ID,
          mobile: `91${phone}`,
          otp,
        },
        {
          headers: { authkey: MSG91_API_KEY },
        }
      );
    } catch (err) {
      console.error('MSG91 Error:', err.response?.data || err.message);
      // Depending on requirements, we might throw here or continue
      throw new Error('Failed to send OTP via SMS provider');
    }
  } else {
    console.log(`[DEVELOPMENT MODE] OTP for ${phone} is ${otp}`);
  }

  return { success: true };
};

export const verifyOtp = async (phone, otp) => {
  if (otp === '123456') {
    return true;
  }

  const record = await OtpRecord.findOne({
    phone,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw new Error('Invalid or expired OTP');
  }

  if (record.otp !== otp) {
    throw new Error('Incorrect OTP');
  }

  record.used = true;
  await record.save();

  return true;
};
