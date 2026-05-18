import { useNavigate, useLocation } from 'react-router-dom';
import { User, ChevronDown, Bell } from 'lucide-react';
import API_BASE_URL from '../config/api';

export default function TopNav({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  }

  const getAvatarSrc = () => {
    if (!user?.avatar_url) return null;
    return user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL.replace('/api/v1', '')}${user.avatar_url}`;
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Submissions', path: '/today-submissions' },
    { name: 'Users', path: '/users' }
  ].filter(item => {
    if (item.name === 'Submissions') {
      return user?.role === 'MOBILE_USER';
    }
    if (item.name === 'Users') {
      return user?.role === 'MASTER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
    }
    return true;
  });

  return (
    <header className="top-nav">
      <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <img src="/logo.png" alt="PR ELECTRICALS" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
        PR ELECTRICALS Platform
      </div>
      <div className="nav-links">
        {navItems.map(item => (
          <a 
            key={item.name}
            href="#" 
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); navigate(item.path); }}
          >
            {item.name}
          </a>
        ))}
        
        <div style={{ padding: '0 1rem', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <Bell size={20} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {user?.avatar_url ? (
              <img 
                src={getAvatarSrc()} 
                alt={user.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} color="#6b7280" />
            )}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{user?.name?.toUpperCase() || 'ADMIN'}</span>
          <ChevronDown size={16} />
        </div>
        
        <button onClick={handleLogout} className="btn" style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--text-muted)' }}>Logout</button>
      </div>
    </header>
  )
}
