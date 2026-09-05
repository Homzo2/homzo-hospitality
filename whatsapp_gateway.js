const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const SESSION_DIR = path.resolve(__dirname, 'whatsapp_session');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

let sock = null;
let currentQrRaw = null;
let currentQrDataUrl = null;
let isConnected = false;
let connectedPhone = null;
let isInitializing = false;
let reconnectTimer = null;

async function initWhatsAppGateway() {
  if (isInitializing) return;
  isInitializing = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      browser: ['Homzo Hospitality', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQrRaw = qr;
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr);
        } catch (err) {
          console.error('[WHATSAPP GATEWAY] QR generation error:', err);
        }
        console.log('\n======================================================');
        console.log('📲 [WHATSAPP GATEWAY] Scan QR code to connect WhatsApp:');
        console.log('👉 Open WhatsApp -> Linked Devices -> Link a Device');
        console.log('🌐 Or view scan page at: http://localhost:3000/whatsapp-qr');
        console.log('======================================================\n');
      }

      if (connection === 'close') {
        isConnected = false;
        connectedPhone = null;
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[WHATSAPP GATEWAY] Connection closed (Reason: ${statusCode || 'Unknown'}). Reconnecting: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[WHATSAPP GATEWAY] Device logged out. Clearing session for fresh QR...');
          try {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            fs.mkdirSync(SESSION_DIR, { recursive: true });
          } catch (e) {}
        }

        if (shouldReconnect) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            isInitializing = false;
            initWhatsAppGateway();
          }, 5000);
        } else {
          isInitializing = false;
          initWhatsAppGateway();
        }
      } else if (connection === 'open') {
        isConnected = true;
        currentQrRaw = null;
        currentQrDataUrl = null;
        connectedPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'Active';
        console.log(`\n======================================================`);
        console.log(`✅ [WHATSAPP GATEWAY] Connected Successfully!`);
        console.log(`📱 Active WhatsApp Sender Number: +${connectedPhone}`);
        console.log(`======================================================\n`);
      }
    });
  } catch (err) {
    console.error('[WHATSAPP GATEWAY] Initialization error:', err);
  } finally {
    isInitializing = false;
  }
}

// Utility to clean phone number to standard digits
function sanitizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return digits;
}

// Send WhatsApp message
async function sendWhatsAppMessage(to, message) {
  const cleanPhone = sanitizePhone(to);
  if (!cleanPhone) {
    return { success: false, error: 'Invalid recipient phone number.' };
  }

  if (!isConnected || !sock) {
    return {
      success: false,
      notConnected: true,
      error: 'WhatsApp Gateway is not connected. Please scan the QR code first.'
    };
  }

  try {
    const jid = `${cleanPhone}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text: message });
    return {
      success: true,
      messageId: result?.key?.id,
      to: cleanPhone
    };
  } catch (err) {
    console.error(`[WHATSAPP GATEWAY] Failed to send message to ${cleanPhone}:`, err);
    return { success: false, error: err.message };
  }
}

// Get current gateway status
function getWhatsAppStatus() {
  return {
    isConnected,
    connectedPhone,
    hasQr: !!currentQrDataUrl,
    qrCodeDataUrl: currentQrDataUrl
  };
}

// Reset / Logout
async function resetWhatsAppSession() {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (e) {}
  try {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  } catch (e) {}
  isConnected = false;
  connectedPhone = null;
  currentQrRaw = null;
  currentQrDataUrl = null;
  isInitializing = false;
  initWhatsAppGateway();
  return { success: true, message: 'WhatsApp session reset successfully.' };
}

module.exports = {
  initWhatsAppGateway,
  sendWhatsAppMessage,
  getWhatsAppStatus,
  resetWhatsAppSession,
  sanitizePhone
};
