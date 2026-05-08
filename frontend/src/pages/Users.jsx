import { useState, useEffect } from 'react';
import TopNav from '../components/TopNav';
import { Users as UsersIcon, UserPlus, Search, Shield, User } from 'lucide-react';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';

export default function Users() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch users from real backend API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://127.0.0.1:3000/api/v1/auth/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="app-container">
      <TopNav user={user} />
      
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Team Management</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage administrators and field surveyors.</p>
          </div>
          {user.role === 'MASTER_ADMIN' && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><UserPlus size={18} /> Add User</button>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="input-group" style={{ flex: 1, margin: 0, flexDirection: 'row', alignItems: 'center', background: '#f9fafb', padding: '0 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <Search size={20} color="var(--text-muted)" />
              <input type="text" placeholder="Search users by name or email..." style={{ border: 'none', background: 'transparent', width: '100%', padding: '0.75rem', outline: 'none' }} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem' }}>User</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users from database...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.name ? u.name.charAt(0).toUpperCase() : <User size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{u.name}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', 
                        background: u.role === 'MASTER_ADMIN' ? 'rgba(139, 92, 246, 0.1)' : u.role === 'ADMIN' ? 'rgba(59, 130, 246, 0.1)' : '#f3f4f6',
                        color: u.role === 'MASTER_ADMIN' ? 'var(--primary-purple)' : u.role === 'ADMIN' ? '#3b82f6' : '#4b5563'
                      }}>
                        {u.role === 'MASTER_ADMIN' && <Shield size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#059669' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Active
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button className="btn" style={{ background: 'transparent', color: '#3b82f6', padding: '0' }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <CreateAdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
