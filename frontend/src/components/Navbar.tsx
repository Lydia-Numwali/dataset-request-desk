import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, FileText, Upload, BarChart3, Users, LogOut, Shield } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '0.85rem 2rem', marginBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '0.55rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DATASET REQUEST DESK
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '500' }}>Internal Teleoperation Operations</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: activeTab === 'requests' ? 'white' : 'var(--text-muted)',
              background: activeTab === 'requests' ? 'var(--primary)' : 'transparent'
            }}
          >
            <FileText size={16} />
            Requests
          </button>

          {(user.role === 'operator' || user.role === 'admin') && (
            <button
              onClick={() => setActiveTab('import')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: activeTab === 'import' ? 'white' : 'var(--text-muted)',
                background: activeTab === 'import' ? 'var(--primary)' : 'transparent'
              }}
            >
              <Upload size={16} />
              CSV Import
            </button>
          )}

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: activeTab === 'analytics' ? 'white' : 'var(--text-muted)',
              background: activeTab === 'analytics' ? 'var(--primary)' : 'transparent'
            }}
          >
            <BarChart3 size={16} />
            Analytics
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: activeTab === 'admin' ? 'white' : 'var(--text-muted)',
                background: activeTab === 'admin' ? 'var(--primary)' : 'transparent'
              }}
            >
              <Users size={16} />
              Users & Admin
            </button>
          )}
        </nav>

        {/* Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {user.name || user.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span className={`badge badge-${user.role}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>
                <Shield size={10} />
                {user.role}
              </span>
              {user.organisation && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>• {user.organisation}</span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="btn-secondary"
            title="Log out"
            style={{ padding: '0.55rem', borderRadius: 'var(--radius-sm)' }}
          >
            <LogOut size={18} />
          </button>
        </div>

      </div>
    </header>
  );
};
