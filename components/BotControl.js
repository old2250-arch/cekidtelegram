import { useState } from 'react';

export default function BotControl({ 
  botStatus, 
  botInfo, 
  onTokenSubmit, 
  onStopBot, 
  onBroadcast,
  loading,
  webhookUrl 
}) {
  const [token, setToken] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) {
      onTokenSubmit(token.trim());
      setToken('');
    }
  };

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (broadcastMessage.trim()) {
      onBroadcast(broadcastMessage.trim());
      setBroadcastMessage('');
      setShowBroadcast(false);
    }
  };

  return (
    <div className="bot-control">
      <div className="status-indicator">
        <div className={`status-dot ${botStatus}`}></div>
        <span>Status: {botStatus.toUpperCase()}</span>
        {botStatus === 'online' && webhookUrl && (
          <span className="webhook-indicator">🌐 Webhook Active</span>
        )}
      </div>

      {botStatus === 'offline' ? (
        <form onSubmit={handleSubmit} className="token-form">
          <div className="token-input-wrapper">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Masukkan Token Bot Telegram"
              required
              className="token-input"
            />
            <button 
              type="button" 
              onClick={() => setShowToken(!showToken)}
              className="btn-toggle-visibility"
            >
              {showToken ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn-start">
            {loading ? 'Memulai...' : '🚀 Start Bot dengan Webhook'}
          </button>
          <small className="hint">
            Dapatkan token dari @BotFather di Telegram. Bot akan menggunakan webhook untuk efisiensi.
          </small>
        </form>
      ) : (
        <div className="bot-info">
          <h3>🤖 Bot Information</h3>
          {botInfo && (
            <>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Username:</strong> @{botInfo.username}
                </div>
                <div className="info-item">
                  <strong>Nama:</strong> {botInfo.first_name}
                </div>
                <div className="info-item">
                  <strong>ID:</strong> {botInfo.id}
                </div>
                <div className="info-item">
                  <strong>DC ID:</strong> {botInfo.dc_id || 'N/A'}
                </div>
                <div className="info-item">
                  <strong>Premium:</strong> {botInfo.is_premium ? '✅ Ya' : '❌ Tidak'}
                </div>
                {webhookUrl && (
                  <div className="info-item full-width">
                    <strong>Webhook URL:</strong>
                    <code className="webhook-url">{webhookUrl}</code>
                  </div>
                )}
              </div>
              
              <div className="action-buttons">
                <button onClick={onStopBot} className="btn-stop">
                  ⏹️ Stop Bot & Hapus Webhook
                </button>
                
                <button 
                  onClick={() => setShowBroadcast(!showBroadcast)} 
                  className="btn-broadcast"
                >
                  📢 Broadcast Message
                </button>
              </div>

              {showBroadcast && (
                <form onSubmit={handleBroadcast} className="broadcast-form">
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Tulis pesan broadcast..."
                    rows="4"
                    required
                    className="broadcast-input"
                  />
                  <button type="submit" className="btn-send">
                    📨 Kirim ke Semua User
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}