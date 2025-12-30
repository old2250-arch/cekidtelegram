import { useState } from 'react';

export default function UserList({ users, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>👥 Pengguna Bot</h3>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-refresh">
          {refreshing ? 'Memperbarui...' : '🔄 Refresh'}
        </button>
      </div>
      
      {users.length === 0 ? (
        <p className="empty-message">Belum ada pengguna</p>
      ) : (
        <div className="users-grid">
          {users.map((user, index) => (
            <div key={index} className="user-card">
              <div className="user-header">
                <span className="user-name">
                  {user.first_name} {user.last_name || ''}
                </span>
                {user.is_premium && <span className="premium-badge">⭐</span>}
              </div>
              <div className="user-details">
                <div>ID: <code>{user.id}</code></div>
                {user.username && <div>Username: @{user.username}</div>}
                <div>DC: {user.dc_id || 'N/A'}</div>
                <div>Premium: {user.is_premium ? 'Ya' : 'Tidak'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}