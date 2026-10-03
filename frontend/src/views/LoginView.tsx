import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, KeyRound, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Logo Banner */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', boxShadow: 'var(--shadow-glow)' }}>
            <Bot size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.03em' }}>Dataset Request Desk</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>Robotics Data Collection Teleoperation Platform</p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={{ width: '100%', paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.75rem' }}>
              {isSubmitting ? 'Signing in...' : 'Sign In to Workspace'}
              <ArrowRight size={18} />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
