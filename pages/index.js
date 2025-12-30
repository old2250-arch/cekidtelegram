import { useState, useEffect } from 'react';
import BotControl from '../components/BotControl';
import UserList from '../components/UserList';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const [botStatus, setBotStatus] = useState('offline');
  const [botInfo, setBotInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const checkBotStatus = async () => {
    try {
      const response = await fetch('/api/bot?action=status');
      const data = await response.json();
      setBotStatus(data.status);
      setBotInfo(data.botInfo || null);
      if (data.users) setUsers(data.users);
    } catch (error) {
      console.error('Error checking bot status:', error);
    }
  };

  useEffect(() => {
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTokenSubmit = async (token) => {
    setLoading(true);
    try {
      const response = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'start' })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Bot berhasil diaktifkan!');
        setBotStatus('online');
        setBotInfo(data.botInfo);
      } else {
        toast.error(data.error || 'Gagal mengaktifkan bot');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
    setLoading(false);
  };

  const handleStopBot = async () => {
    try {
      const response = await fetch('/api/bot?action=stop', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('Bot berhasil dihentikan');
        setBotStatus('offline');
        setBotInfo(null);
      }
    } catch (error) {
      toast.error('Gagal menghentikan bot');
    }
  };

  const handleBroadcast = async (message) => {
    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Broadcast berhasil dikirim ke ${data.sent} pengguna`);
      } else {
        toast.error(data.error || 'Gagal mengirim broadcast');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  return (
    <div className="container">
      <Toaster position="top-right" />
      
      <header>
        <h1>🤖 Telegram Bot Control</h1>
        <p>Kontrol bot Telegram Anda dari web ini</p>
      </header>

      <main>
        <BotControl
          botStatus={botStatus}
          botInfo={botInfo}
          onTokenSubmit={handleTokenSubmit}
          onStopBot={handleStopBot}
          onBroadcast={handleBroadcast}
          loading={loading}
        />

        {botStatus === 'online' && (
          <UserList users={users} onRefresh={checkBotStatus} />
        )}

        <div className="features">
          <h3>✨ Fitur Bot:</h3>
          <ul>
            <li>✅ /start - Menampilkan info user</li>
            <li>✅ /info [reply/user] - Cek info user lain</li>
            <li>✅ /id - Cek ID chat/grup</li>
            <li>✅ /broadcast [reply] - Broadcast ke semua user (owner only)</li>
            <li>✅ Support group dan private chat</li>
            <li>✅ Deteksi premium status</li>
          </ul>
        </div>
      </main>

      <footer>
        <p>© 2024 Telegram Bot Control - Deploy di Vercel</p>
      </footer>
    </div>
  );
}