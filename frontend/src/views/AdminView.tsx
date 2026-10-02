import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { apiFetch } from '../api/client';
import { Users, UserPlus, Shield, CheckCircle, XCircle } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal for Create User
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch<User[]>('/users');
      setUsers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, organisation, role }),
      });
      setShowModal(false);
      setEmail('');
      setPassword('');
      setName('');
      setOrganisation('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      await apiFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangeRole = async (userId: string, newRole: Role) => {
    try {
      await apiFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 3rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>User & Access Control Admin</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Create users, manage platform roles, and deactivate accounts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <UserPlus size={18} /> Create New User
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading user directory...</div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>User / Email</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Organisation</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Created</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: 'white' }}>{u.name || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>{u.organisation || 'N/A'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value as Role)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        <option value="client">client</option>
                        <option value="operator">operator</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {u.is_active ? (
                        <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <XCircle size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleUserActive(u.id, u.is_active)}
                        className={u.is_active ? 'btn-danger' : 'btn-success'}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Create User */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem' }}>Create User Account</h3>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Email Address
                </label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Password
                </label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Full Name
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Organisation
                </label>
                <input type="text" value={organisation} onChange={(e) => setOrganisation(e.target.value)} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  System Role
                </label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ width: '100%' }}>
                  <option value="client">client</option>
                  <option value="operator">operator</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
