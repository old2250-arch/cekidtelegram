import crypto from 'crypto';
import axios from 'axios';

// Simpan state bot di memory
const botInstances = new Map();
const users = new Map();

export default async function handler(req, res) {
  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    const { action, token } = req.body;

    if (action === 'set-webhook') {
      try {
        const webhookUrl = `${req.headers.origin || process.env.VERCEL_URL}/api/webhook?token=${encodeURIComponent(token)}`;
        
        // Set webhook ke Telegram
        const response = await axios.post(
          `https://api.telegram.org/bot${token}/setWebhook`,
          {
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query'],
            drop_pending_updates: true
          }
        );

        if (response.data.ok) {
          // Simpan token dan inisialisasi bot
          botInstances.set(token, {
            token,
            webhookUrl,
            info: null,
            status: 'online'
          });

          res.status(200).json({
            success: true,
            message: 'Webhook berhasil diatur',
            webhookUrl
          });
        } else {
          res.status(400).json({
            success: false,
            error: response.data.description || 'Gagal mengatur webhook'
          });
        }
      } catch (error) {
        console.error('Error setting webhook:', error);
        res.status(500).json({
          success: false,
          error: 'Terjadi kesalahan saat mengatur webhook'
        });
      }
    } 
    else if (action === 'delete-webhook') {
      try {
        await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`);
        
        // Hapus dari memory
        botInstances.delete(token);
        
        res.status(200).json({
          success: true,
          message: 'Webhook berhasil dihapus'
        });
      } catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({
          success: false,
          error: 'Terjadi kesalahan saat menghapus webhook'
        });
      }
    }
    else {
      res.status(400).json({ error: 'Action tidak valid' });
    }
  }
  else if (req.method === 'GET') {
    const { token } = req.query;

    if (req.query['action'] === 'status') {
      const botData = botInstances.get(token);
      if (botData) {
        res.status(200).json({
          status: 'online',
          webhookUrl: botData.webhookUrl,
          users: Array.from(users.values()).filter(u => u.botToken === token)
        });
      } else {
        res.status(200).json({ status: 'offline' });
      }
    }
    else {
      // Ini adalah endpoint webhook untuk menerima update dari Telegram
      try {
        const update = req.body;
        
        // Cari token yang sesuai berdasarkan webhook URL
        let botToken = null;
        let botInstance = null;
        
        for (let [token, instance] of botInstances) {
          if (instance.webhookUrl.includes(req.url)) {
            botToken = token;
            botInstance = instance;
            break;
          }
        }

        if (!botToken || !botInstance) {
          return res.status(404).json({ error: 'Bot tidak ditemukan' });
        }

        // Handle update
        await handleUpdate(botToken, update, req);

        res.status(200).json({ ok: true });
      } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleUpdate(token, update, req) {
  if (!update.message) return;

  const message = update.message;
  const chatId = message.chat.id;
  const user = message.from;
  
  // Simpan user
  users.set(user.id, {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    is_premium: user.is_premium || false,
    dc_id: user.dc_id || null,
    botToken: token,
    last_active: new Date().toISOString()
  });

  // Get bot info pertama kali
  let botInstance = botInstances.get(token);
  if (!botInstance.info) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
      botInstance.info = response.data.result;
      botInstances.set(token, botInstance);
    } catch (error) {
      console.error('Error getting bot info:', error);
    }
  }

  // Handle commands
  if (message.text) {
    if (message.text.startsWith('/start')) {
      await sendMessage(token, chatId, getStartMessage(user));
    }
    else if (message.text.startsWith('/info')) {
      await handleInfoCommand(token, message);
    }
    else if (message.text.startsWith('/id')) {
      await sendMessage(token, chatId, getIdMessage(message));
    }
    else if (message.text.startsWith('/broadcast')) {
      await handleBroadcastCommand(token, message);
    }
  }
}

async function sendMessage(token, chatId, text, parseMode = 'Markdown') {
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    });
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

function getStartMessage(user) {
  return `
🤖 *Informasi Akun Anda:*

👤 *Username:* ${user.username ? '@' + user.username : 'Tidak ada'}
📛 *Nama:* ${user.first_name} ${user.last_name || ''}
🆔 *ID:* \`${user.id}\`
🏢 *DC ID:* ${user.dc_id || 'Tidak diketahui'}
⭐ *Premium:* ${user.is_premium ? 'Ya' : 'Tidak'}

*Fitur yang tersedia:*
/info - Cek info user lain
/id - Cek ID chat/grup
/broadcast - Broadcast ke semua user (owner only)
  `;
}

async function handleInfoCommand(token, message) {
  const chatId = message.chat.id;
  const replyToMessage = message.reply_to_message;
  
  let targetUser = null;
  
  if (replyToMessage) {
    targetUser = replyToMessage.from;
  } else if (message.text.split(' ')[1]) {
    const username = message.text.split(' ')[1].replace('@', '');
    // Cari user dari yang tersimpan
    for (let [id, userData] of users) {
      if (userData.username === username) {
        targetUser = userData;
        break;
      }
    }
  } else {
    targetUser = message.from;
  }

  if (!targetUser) {
    await sendMessage(token, chatId, 'User tidak ditemukan');
    return;
  }

  const response = `
📋 *Informasi User:*

👤 *Username:* ${targetUser.username ? '@' + targetUser.username : 'Tidak ada'}
📛 *Nama:* ${targetUser.first_name} ${targetUser.last_name || ''}
🆔 *ID:* \`${targetUser.id}\`
🏢 *DC ID:* ${targetUser.dc_id || 'Tidak diketahui'}
⭐ *Premium:* ${targetUser.is_premium ? 'Ya' : 'Tidak'}
  `;

  await sendMessage(token, chatId, response);
}

function getIdMessage(message) {
  return `
💬 *Chat ID:* \`${message.chat.id}\`
👤 *Your ID:* \`${message.from.id}\`
📛 *Chat Type:* ${message.chat.type}
${message.chat.title ? `🏷️ *Group Title:* ${message.chat.title}` : ''}
  `;
}

async function handleBroadcastCommand(token, message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  
  // Cek apakah user adalah owner (ganti dengan ID Anda)
  const OWNER_ID = process.env.OWNER_ID || userId;
  
  if (parseInt(userId) !== parseInt(OWNER_ID)) {
    await sendMessage(token, chatId, '❌ Hanya owner yang bisa menggunakan command ini!');
    return;
  }

  const replyToMessage = message.reply_to_message;
  if (!replyToMessage || !replyToMessage.text) {
    await sendMessage(token, chatId, 'Silakan reply pesan yang ingin di-broadcast');
    return;
  }

  const broadcastText = replyToMessage.text;
  const allUsers = Array.from(users.values()).filter(u => u.botToken === token);
  let successCount = 0;
  let failCount = 0;

  for (const user of allUsers) {
    try {
      await sendMessage(token, user.id, `📢 *Broadcast:*\n\n${broadcastText}\n\n_Sent via Bot Control Panel_`);
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  await sendMessage(
    token,
    chatId,
    `✅ Broadcast selesai!\n\nBerhasil: ${successCount}\nGagal: ${failCount}\nTotal: ${allUsers.length}`
  );
}

// Endpoint untuk menerima update webhook
export const config = {
  api: {
    bodyParser: true,
  },
};