declare module 'react/jsx-runtime';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

import React, { useState, useEffect } from 'react';
import { RequestItem } from '../types';
import { apiFetch } from '../api/client';
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, Layers, Calendar, ChevronRight } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for Create Request
  const [showModal, setShowModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [episodesRequested, setEpisodesRequested] = useState(10);
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch<RequestItem[]>('/requests');
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify({
          task_name: taskName,
          episodes_requested: Number(episodesRequested),
          deadline: new Date(deadline).toISOString(),
          notes: notes || undefined,
        }),
      });
      setShowModal(false);
      setTaskName('');
      setNotes('');
      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (requestId: string, targetStatus: 'accepted' | 'rejected') => {
    try {
      await apiFetch(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 3rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>My Dataset Requests</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Track, create, and manage your teleoperation dataset deliveries</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={18} />
          Create New Request
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Layers size={48} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>No Requests Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>You haven't submitted any dataset requests yet.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Create Your First Request
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {requests.map((req) => {
            const assignedCount = req.assignments ? req.assignments.length : 0;
            const progressPct = Math.min(100, Math.round((assignedCount / req.episodes_requested) * 100));

            return (
              <div key={req.id} className="glass-panel glass-panel-hover" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'white' }}>{req.task_name}</h3>
                      <span className={`badge badge-${req.status}`}>{req.status.replace('_', ' ')}</span>
                    </div>
                    {req.notes && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>{req.notes}</p>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.85rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} /> Deadline: {new Date(req.deadline).toLocaleDateString()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={14} /> Created: {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Delivery Actions for Client when Delivered */}
                  {req.status === 'delivered' && (
                    <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <button onClick={() => handleStatusChange(req.id, 'accepted')} className="btn-success">
                        <CheckCircle size={16} /> Accept Delivery
                      </button>
                      <button onClick={() => handleStatusChange(req.id, 'rejected')} className="btn-danger">
                        <XCircle size={16} /> Reject & Rework
                      </button>
                    </div>
                  )}

                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: '600' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Episodes</span>
                    <span style={{ color: assignedCount >= req.episodes_requested ? '#4ade80' : 'var(--text-main)' }}>
                      {assignedCount} / {req.episodes_requested} Episodes ({progressPct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct >= 100 ? '#22c55e' : 'var(--primary)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Status Timeline History */}
                {req.history && req.history.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Audit History:</span>
                    {req.history.map((h, idx) => (
                      <React.Fragment key={h.id}>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          {h.to_status} ({new Date(h.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                        {idx < req.history.length - 1 && <ChevronRight size={12} />}
                      </React.Fragment>
                    ))}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog for Create Request */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.25rem' }}>Create Dataset Request</h3>
            
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Task Name / Description
                </label>
                <input
                  type="text"
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. pick cup, open drawer, fold towel"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Episodes Requested Count
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={episodesRequested}
                  onChange={(e) => setEpisodesRequested(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Target Delivery Deadline
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Additional Specifications / Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Needs smooth teleoperation motion, arm-01 preferred..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
