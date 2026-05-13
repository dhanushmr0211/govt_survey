import { useState } from 'react';
import TopNav from '../components/TopNav';
import { Activity, FileText, Settings, Shield, User } from 'lucide-react';

export default function Profile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState('Personal Info');

  const tabs = [
    { name: 'Personal Info', icon: User },
    { name: 'Admin Details', icon: FileText },
    { name: 'Security', icon: Shield },
    { name: 'Preferences', icon: Settings },
    { name: 'Activity History', icon: Activity },
  ];

  return (
    <div className="app-container">
      <TopNav user={user} />

      <main className="main-content">
        <div className="card profile-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-details">
              <h2>{user?.name?.toUpperCase() || 'USER'}</h2>
              <p>{user.email}</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge">{user.role}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Regional Office - Active</span>
              </div>
            </div>
          </div>
          <button className="btn btn-primary">Edit Profile</button>
        </div>

        <div className="card">
          <div className="tabs-container">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.name}
                  className={`tab ${activeTab === tab.name ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  <Icon size={16} /> {tab.name}
                </button>
              );
            })}
          </div>

          <div style={{ minHeight: '300px' }}>
            {activeTab === 'Personal Info' && (
              <div className="form-grid">
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" className="input-field" defaultValue={user.name} readOnly />
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" className="input-field" defaultValue={user.email} readOnly />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="text" className="input-field" defaultValue="+91 9876543210" />
                </div>
                <div className="input-group">
                  <label>Department</label>
                  <input type="text" className="input-field" defaultValue="Infrastructure" />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Bio / Notes</label>
                  <textarea className="input-field" rows="4" placeholder="Enter details..." />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            )}
            {activeTab !== 'Personal Info' && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-muted)' }}>
                {activeTab} module under construction.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
