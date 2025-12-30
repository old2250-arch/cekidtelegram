export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message || !global.botData || !global.botData.botInstance) {
    return res.status(400).json({ error: 'Bot not running or no message provided' });
  }

  try {
    const users = global.botData.users || [];
    let sentCount = 0;
    let failedCount = 0;

    // Broadcast ke semua user
    for (const user of users) {
      try {
        await global.botData.botInstance.sendMessage(
          user.id,
          `📢 *Broadcast dari Admin:*\n\n${message}\n\n_Sent via Bot Control Panel_`,
          { parse_mode: 'Markdown' }
        );
        sentCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to send to user ${user.id}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: users.length,
      message: 'Broadcast completed'
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to broadcast' });
  }
}