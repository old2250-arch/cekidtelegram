import axios from 'axios';

// Simpan data bot di global variable
if (!global.botData) {
  global.botData = {
    instances: new Map(),
    users: new Map()
  };
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    const { token, action } = req.body;

    if (action === 'start' && token) {
      try {
        // Hentikan bot lama jika ada
        if (global.botData.instances.has(token)) {
          // Delete webhook lama
          await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`);
        }

        // Set webhook baru
        const webhookUrl = `${req.headers.origin || process.env.VERCEL_URL}/api/webhook?token=${encodeURIComponent(token)}`;
        
        const webhookResponse = await axios.post(
          `https://api.telegram.org/bot${token}/setWebhook`,
          {
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query'],
            drop_pending_updates: true
          }
        );

        if (!webhookResponse.data.ok) {
          throw new Error('Failed to set webhook');
        }

        // Get bot info
        const botInfoResponse = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        const botInfo = botInfoResponse.data.result;

        // Set bot commands
        await axios.post(`https://api.telegram.org/bot${token}/setMyCommands`, {
          commands: [
            { command: 'start', description: 'Mulai bot' },
            { command: 'info', description: 'Cek info user' },
            { command: 'id', description: 'Cek ID chat' },
            { command: 'broadcast', description: 'Broadcast message (owner only)' }
          ]
        });

        // Simpan bot instance
        global.botData.instances.set(token, {
          token,
          webhookUrl,
          info: botInfo,
          status: 'online',
          startedAt: new Date().toISOString()
        });

        res.status(200).json({
          success: true,
          message: 'Bot started successfully with webhook',
          botInfo: {
            id: botInfo.id,
            username: botInfo.username,
            first_name: botInfo.first_name,
            is_premium: botInfo.is_premium || false,
            dc_id: botInfo.dc_id || null
          },
          webhookUrl
        });

      } catch (error) {
        console.error('Error starting bot:', error);
        res.status(500).json({
          success: false,
          error: error.response?.data?.description || 'Failed to start bot. Invalid token or bot error.'
        });
      }
    } 
    else if (action === 'stop') {
      try {
        await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`);
        global.botData.instances.delete(token);
        
        // Hapus users dari bot ini
        const usersToDelete = [];
        for (let [id, user] of global.botData.users) {
          if (user.botToken === token) {
            usersToDelete.push(id);
          }
        }
        usersToDelete.forEach(id => global.botData.users.delete(id));
        
        res.status(200).json({ success: true, message: 'Bot stopped successfully' });
      } catch (error) {
        console.error('Error stopping bot:', error);
        res.status(500).json({ success: false, error: 'Failed to stop bot' });
      }
    }
  } 
  else if (req.method === 'GET') {
    const action = req.query.action;
    
    if (action === 'status') {
      const token = req.query.token;
      
      if (token) {
        const instance = global.botData.instances.get(token);
        if (instance) {
          const botUsers = Array.from(global.botData.users.values())
            .filter(u => u.botToken === token);
          
          res.status(200).json({
            status: 'online',
            botInfo: instance.info,
            users: botUsers,
            totalUsers: botUsers.length,
            startedAt: instance.startedAt,
            webhookUrl: instance.webhookUrl
          });
        } else {
          res.status(200).json({ status: 'offline' });
        }
      } else {
        // Return semua bots
        const instances = Array.from(global.botData.instances.values()).map(instance => ({
          token: instance.token.substring(0, 10) + '...', // Mask token
          username: instance.info?.username,
          status: instance.status,
          users: Array.from(global.botData.users.values())
            .filter(u => u.botToken === instance.token).length
        }));
        
        res.status(200).json({
          status: instances.length > 0 ? 'running' : 'idle',
          instances,
          totalBots: instances.length
        });
      }
    }
  } 
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}