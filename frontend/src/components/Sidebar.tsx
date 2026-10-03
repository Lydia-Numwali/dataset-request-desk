import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, FileText, Upload, BarChart3, Users, LogOut, Shield, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <aside
      className="glass-panel"
      style={{
        width: '270px',
        minHeight: '100vh',
        borderRadius: 0,
        borderTop: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.5rem 1rem',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        zIndex: 50
      }}
    >
      <div>
        {/* Branding Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.5rem 0.5rem 1.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '0.6rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
            <Bot size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DATASET DESK
            </h1>
            <p style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: '600' }}>Teleoperation Portal</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.75rem 0.4rem' }}>
            Main Menu
          </div>

          <button
            onClick={() => setActiveTab('requests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'requests' ? 'white' : 'var(--text-muted)',
              background: activeTab === 'requests' ? 'linear-gradient(90deg, var(--primary) 0%, #4f46e5 100%)' : 'transparent',
              boxShadow: activeTab === 'requests' ? '0 4px 12px var(--primary-glow)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={18} color={activeTab === 'requests' ? 'white' : 'var(--text-dim)'} />
              Requests
            </div>
            {activeTab === 'requests' && <ChevronRight size={16} />}
          </button>

          {(user.role === 'operator' || user.role === 'admin') && (
            <button
              onClick={() => setActiveTab('import')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: activeTab === 'import' ? 'white' : 'var(--text-muted)',
                background: activeTab === 'import' ? 'linear-gradient(90deg, var(--primary) 0%, #4f46e5 100%)' : 'transparent',
                boxShadow: activeTab === 'import' ? '0 4px 12px var(--primary-glow)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Upload size={18} color={activeTab === 'import' ? 'white' : 'var(--text-dim)'} />
                CSV Import
              </div>
              {activeTab === 'import' && <ChevronRight size={16} />}
            </button>
          )}

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'analytics' ? 'white' : 'var(--text-muted)',
              background: activeTab === 'analytics' ? 'linear-gradient(90deg, var(--primary) 0%, #4f46e5 100%)' : 'transparent',
              boxShadow: activeTab === 'analytics' ? '0 4px 12px var(--primary-glow)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BarChart3 size={18} color={activeTab === 'analytics' ? 'white' : 'var(--text-dim)'} />
              Analytics
            </div>
            {activeTab === 'analytics' && <ChevronRight size={16} />}
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: activeTab === 'admin' ? 'white' : 'var(--text-muted)',
                background: activeTab === 'admin' ? 'linear-gradient(90deg, var(--primary) 0%, #4f46e5 100%)' : 'transparent',
                boxShadow: activeTab === 'admin' ? '0 4px 12px var(--primary-glow)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={18} color={activeTab === 'admin' ? 'white' : 'var(--text-dim)'} />
                Users & Admin
              </div>
              {activeTab === 'admin' && <ChevronRight size={16} />}
            </button>
          )}
        </nav>
      </div>

      {/* User Profile Footer Card */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ overflow: 'hidden', marginRight: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || user.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span className={`badge badge-${user.role}`} style={{ fontSize: '0.6rem', padding: '0.05rem 0.4rem' }}>
                  <Shield size={9} />
                  {user.role}
                </span>
              </div>
              {user.organisation && (
                <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.organisation}
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="btn-secondary"
              title="Log out"
              style={{ padding: '0.55rem', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

    </aside>
  );
};
