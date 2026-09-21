/**
 * WHATSAPP DELIVERY SERVICE
 * Official API integration for automated report notifications
 * Providers supported: Twilio WhatsApp API & Meta WhatsApp Cloud API
 */

require('dotenv').config();
const https = require('https');

/**
 * Format phone number to E.164 (e.g. +15551234567)
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Send WhatsApp Notification for Weekly/Monthly Attendance Reports
 * @param {Object} params
 * @param {string} params.reportId - Report ID in generated_reports
 * @param {string} params.reportType - 'WEEKLY' | 'MONTHLY'
 * @param {string} params.periodLabel - e.g. "14 September 2026 – 20 September 2026"
 * @param {string} params.recipientPhone - Target WhatsApp phone number
 * @param {string} params.pdfFilename - Filename of generated report
 * @param {string} params.downloadUrl - Direct download link
 * @param {Object} dbPool - MySQL pool to record delivery status
 */
async function sendReportNotification({
  reportId,
  reportType,
  periodLabel,
  recipientPhone,
  pdfFilename,
  downloadUrl,
  dbPool
}) {
  const targetPhone = cleanPhoneNumber(recipientPhone || process.env.MANAGER_WHATSAPP_NUMBER);
  const provider = (process.env.WHATSAPP_PROVIDER || 'TWILIO').toUpperCase();
  const isEnabled = process.env.WHATSAPP_ENABLED === 'true';

  // Check if disabled or missing phone
  if (!isEnabled || !targetPhone) {
    const reason = !isEnabled 
      ? 'WhatsApp delivery is disabled in configuration.' 
      : 'Manager WhatsApp phone number is not configured.';
    
    console.log(`[WHATSAPP] Skipped for report ${reportId}: ${reason}`);

    if (dbPool && reportId) {
      await dbPool.execute(
        'UPDATE generated_reports SET whatsapp_status = "DISABLED", whatsapp_error = ? WHERE id = ?',
        [reason, reportId]
      );
    }

    return {
      success: false,
      status: 'DISABLED',
      message: reason
    };
  }

  // Compose standard official notification message
  const bodyMessage = reportType === 'WEEKLY'
    ? `Hello Manager,\n\nYour weekly staff attendance report is ready.\n\nPeriod:\n${periodLabel}\n\nFile: ${pdfFilename}\nDownload Report: ${downloadUrl}\n\nThe attendance report has been generated successfully.`
    : `Hello Manager,\n\nYour monthly staff attendance report is ready.\n\nPeriod:\n${periodLabel}\n\nFile: ${pdfFilename}\nDownload Report: ${downloadUrl}\n\nThe attendance report has been generated successfully.`;

  try {
    let result = null;

    if (provider === 'TWILIO') {
      result = await sendViaTwilio({
        to: targetPhone,
        body: bodyMessage,
        mediaUrl: downloadUrl
      });
    } else if (provider === 'META') {
      result = await sendViaMeta({
        to: targetPhone,
        body: bodyMessage
      });
    } else {
      throw new Error(`Unsupported WhatsApp provider: ${provider}`);
    }

    if (result.success) {
      console.log(`[WHATSAPP] Report ${reportId} successfully sent to ${targetPhone}`);
      if (dbPool && reportId) {
        await dbPool.execute(
          'UPDATE generated_reports SET whatsapp_status = "SENT", delivery_status = "DELIVERED", whatsapp_error = NULL WHERE id = ?',
          [reportId]
        );
      }
      return { success: true, status: 'SENT' };
    } else {
      throw new Error(result.error || 'Provider rejected request');
    }

  } catch (err) {
    console.error(`[WHATSAPP] Delivery failed for report ${reportId}:`, err.message);

    if (dbPool && reportId) {
      await dbPool.execute(
        'UPDATE generated_reports SET whatsapp_status = "FAILED", whatsapp_error = ? WHERE id = ?',
        [err.message.substring(0, 255), reportId]
      );
    }

    return {
      success: false,
      status: 'FAILED',
      error: err.message
    };
  }
}

/**
 * Dispatch via Twilio Official WhatsApp API
 */
function sendViaTwilio({ to, body, mediaUrl }) {
  return new Promise((resolve) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || '+14155238886'; // Twilio sandbox default

    if (!accountSid || !authToken) {
      return resolve({
        success: false,
        error: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing in .env'
      });
    }

    const postData = new URLSearchParams({
      From: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
      To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      Body: body
    });

    if (mediaUrl && mediaUrl.startsWith('http')) {
      postData.append('MediaUrl', mediaUrl);
    }

    const payload = postData.toString();

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, sid: parsed.sid });
          } else {
            resolve({ success: false, error: parsed.message || `HTTP ${res.statusCode}` });
          }
        } catch (e) {
          resolve({ success: false, error: 'Malformed response from Twilio' });
        }
      });
    });

    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

/**
 * Dispatch via Meta WhatsApp Business Cloud API
 */
function sendViaMeta({ to, body }) {
  return new Promise((resolve) => {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return resolve({
        success: false,
        error: 'META_WHATSAPP_TOKEN or META_PHONE_NUMBER_ID is missing in .env'
      });
    }

    const postData = JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'text',
      text: { body }
    });

    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v18.0/${phoneId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: parsed });
          } else {
            resolve({ success: false, error: (parsed.error && parsed.error.message) || `HTTP ${res.statusCode}` });
          }
        } catch (e) {
          resolve({ success: false, error: 'Malformed response from Meta API' });
        }
      });
    });

    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(postData);
    req.end();
  });
}

module.exports = {
  sendReportNotification,
  cleanPhoneNumber
};
