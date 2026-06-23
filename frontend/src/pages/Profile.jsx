import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import API_BASE_URL from '../config/api';

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const activeProject = useAuthStore((state) => state.activeProject);

  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const showConfirmedStats = isMasterAdmin || (
    activeProject && 
    ['ADMIN', 'EMPLOYEE', 'CLIENT'].includes(activeProject.project_role) && 
    activeProject.section_c === true
  );

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['my-confirmed-stats', activeProject?.id, user?.id],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${activeProject.id}/pole-survey/my-confirmed-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.stats;
    },
    enabled: !!activeProject?.id && showConfirmedStats
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB) and type
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('File is too large. Max size is 5MB.');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setAvatarError('Only JPG and PNG formats are allowed.');
      return;
    }

    setAvatarLoading(true);
    setAvatarError('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      // Update global user object
      setUser({ ...user, avatar_url: res.data.avatar_url });
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setAvatarError(err.response?.data?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) return;

    setAvatarLoading(true);
    setAvatarError('');

    try {
      await axios.delete(`${API_BASE_URL}/auth/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update global user object
      setUser({ ...user, avatar_url: null });
    } catch (err) {
      console.error('Error deleting avatar:', err);
      setAvatarError(err.response?.data?.message || 'Failed to delete photo. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus({ type: 'error', message: 'All fields are required.' });
      return;
    }
    if (newPassword.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to resolve profile picture url
  const getAvatarSrc = () => {
    if (!user?.avatar_url) return null;
    return user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL.replace('/api/v1', '')}${user.avatar_url}`;
  };

  return (
    <div className="app-container">
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: '#f97316',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
        
        {/* Style injection for animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />

        <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
          
          {/* Profile Picture Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatarLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                  <div style={{ width: '24px', height: '24px', border: '3px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                </div>
              ) : null}

              {user?.avatar_url ? (
                <img 
                  src={getAvatarSrc()} 
                  alt={user.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', alignItems: 'center' }}>
              <label 
                className="btn btn-primary" 
                style={{ 
                  margin: 0, 
                  padding: '6px 16px', 
                  fontSize: '0.8125rem', 
                  cursor: avatarLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f97316',
                  borderColor: '#f97316'
                }}
              >
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={handleAvatarUpload} 
                  style={{ display: 'none' }} 
                  disabled={avatarLoading}
                />
                Upload Photo
              </label>

              {user?.avatar_url && (
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  disabled={avatarLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    cursor: avatarLoading ? 'not-allowed' : 'pointer',
                    padding: '6px 12px'
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            {avatarError && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px', fontWeight: '500' }}>
                {avatarError}
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '1.5rem', textAlign: 'center' }}>
            Change Password
          </h2>

          <form onSubmit={handleSubmit} className="form-grid">
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>Current Password</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>New Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                required
              />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>

            {status.message && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  backgroundColor: status.type === 'success' ? '#e6f4ea' : '#fce8e6',
                  color: status.type === 'success' ? '#137333' : '#c5221f',
                  border: `1px solid ${status.type === 'success' ? '#34a853' : '#ea4335'}`
                }}
              >
                {status.message}
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {showConfirmedStats && (
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '1.5rem', textAlign: 'center' }}>
              Your Performance Stats
            </h2>
            
            {!activeProject ? (
              <div style={{ padding: '12px', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #f59e0b', textAlign: 'center' }}>
                Please select an active project from the dashboard to see your performance stats.
              </div>
            ) : statsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <div style={{ width: '24px', height: '24px', border: '3px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
              </div>
            ) : statsData ? (
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '1rem', textAlign: 'center' }}>
                  Project: <span style={{ color: '#f97316' }}>{activeProject.name}</span>
                </p>
                
                {String(activeProject.id) !== '3' ? (
                  /* Project 2 Layout: Switch Points & Poles */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', tracking: '0.05em' }}>SWITCH POINTS</p>
                      <p style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.25rem' }}>{statsData.total_sp}</p>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>+ {statsData.today_sp} today</p>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', tracking: '0.05em' }}>POLES</p>
                      <p style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.25rem' }}>{statsData.total_poles}</p>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>+ {statsData.today_poles} today</p>
                    </div>
                  </div>
                ) : (
                  /* Project 3 Layout: Survey & Installation */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', tracking: '0.05em' }}>SURVEY POLES</p>
                      <p style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.25rem' }}>{statsData.total_survey}</p>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>+ {statsData.today_survey} today</p>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', tracking: '0.05em' }}>INSTALLATIONS</p>
                      <p style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.25rem' }}>{statsData.total_installation}</p>
                      <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>+ {statsData.today_installation} today</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                Failed to load stats data.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
