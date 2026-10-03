import React, { useState, useEffect } from 'react';
import { RequestItem, Episode, Assignment } from '../types';
import { apiFetch } from '../api/client';
import { CheckCircle2, AlertCircle, Filter, Plus, Trash2, RefreshCw, Cpu, Tag, Clock, ArrowRight } from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Episode Filter state
  const [taskFilter, setTaskFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  
  // Assignment Modal State
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqData, epData] = await Promise.all([
        apiFetch<RequestItem[]>('/requests'),
        apiFetch<Episode[]>('/episodes?limit=500')
      ]);
      setRequests(reqData);
      setEpisodes(epData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 4 seconds to observe real-time export job processing status
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusTransition = async (requestId: string, targetStatus: string) => {
    try {
      await apiFetch(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus })
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignEpisode = async (episodeId: string) => {
    if (!selectedRequest) return;
    setIsAssigning(true);
    try {
      await apiFetch(`/requests/${selectedRequest.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ episode_id: episodeId })
      });
      fetchData();
      // Update local selected request view
      const updatedReq = await apiFetch<RequestItem>(`/requests/${selectedRequest.id}`);
      setSelectedRequest(updatedReq);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignEpisode = async (requestId: string, episodeId: string) => {
    try {
      await apiFetch(`/requests/${requestId}/unassign/${episodeId}`, {
        method: 'DELETE'
      });
      fetchData();
      if (selectedRequest && selectedRequest.id === requestId) {
        const updatedReq = await apiFetch<RequestItem>(`/requests/${requestId}`);
        setSelectedRequest(updatedReq);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredEpisodes = episodes.filter((ep) => {
    if (taskFilter && !ep.task_name.toLowerCase().includes(taskFilter.toLowerCase())) return false;
    if (qualityFilter && ep.quality !== qualityFilter) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem 3rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Operator Fulfilment Desk</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fulfill client requests, assign episodes, and monitor export pipelines</p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw size={16} /> Refresh Queue
        </button>
      </div>

      {isLoading && requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading operations queue...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {requests.map((req) => {
            const assignedCount = req.assignments ? req.assignments.length : 0;
            const isThresholdMet = assignedCount >= req.episodes_requested;

            return (
              <div key={req.id} className="glass-panel" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{req.task_name}</h3>
                      <span className={`badge badge-${req.status}`}>{req.status.replace('_', ' ')}</span>
                      {req.client && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                          Client: {req.client.name || req.client.email} ({req.client.organisation})
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Requested: <strong>{req.episodes_requested} episodes</strong></span>
                      <span>Deadline: <strong>{new Date(req.deadline).toLocaleDateString()}</strong></span>
                      {req.notes && <span>Notes: <em style={{ fontStyle: 'italic' }}>{req.notes}</em></span>}
                    </div>
                  </div>

                  {/* Operator Action Buttons for Status Transitions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {req.status === 'submitted' && (
                      <button onClick={() => handleStatusTransition(req.id, 'in_progress')} className="btn-primary">
                        Start Processing <ArrowRight size={16} />
                      </button>
                    )}

                    {req.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => { setSelectedRequest(req); setAssignModalOpen(true); }}
                          className="btn-secondary"
                        >
                          <Plus size={16} /> Assign Episodes ({assignedCount}/{req.episodes_requested})
                        </button>

                        <button
                          onClick={() => handleStatusTransition(req.id, 'delivered')}
                          className="btn-primary"
                          style={{ opacity: isThresholdMet ? 1 : 0.5, cursor: isThresholdMet ? 'pointer' : 'not-allowed' }}
                          title={!isThresholdMet ? `Requires at least ${req.episodes_requested} episodes assigned` : ''}
                        >
                          Deliver to Client <CheckCircle2 size={16} />
                        </button>
                      </>
                    )}

                    {req.status === 'rejected' && (
                      <button onClick={() => handleStatusTransition(req.id, 'in_progress')} className="btn-secondary" style={{ borderColor: 'var(--status-rejected-text)' }}>
                        <RefreshCw size={16} /> Start Rework Pipeline
                      </button>
                    )}
                  </div>

                </div>

                {/* Assigned Episodes List & Background Export Status */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Assigned Episodes ({assignedCount})
                  </h4>

                  {assignedCount === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No episodes assigned yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                      {req.assignments.map((asgn) => (
                        <div key={asgn.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>
                              {asgn.episode_id}
                            </div>
                            {asgn.episode && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                Robot: {asgn.episode.robot_id} | <span className={`badge badge-${asgn.episode.quality}`} style={{ fontSize: '0.6rem', padding: '0.05rem 0.35rem' }}>{asgn.episode.quality}</span>
                              </div>
                            )}
                            {/* Simulated Export Job Status Badge */}
                            <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>Export:</span>
                              <span style={{
                                fontWeight: '700',
                                color: asgn.export_status === 'completed' ? '#4ade80' : asgn.export_status === 'failed' ? '#f87171' : '#fbbf24'
                              }}>
                                {asgn.export_status.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {req.status === 'in_progress' && (
                            <button onClick={() => handleUnassignEpisode(req.id, asgn.episode_id)} style={{ background: 'transparent', color: '#f87171', padding: '0.35rem' }} title="Unassign">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Episode Assignment Drawer/Modal */}
      {assignModalOpen && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Assign Episodes</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Request: <strong>{selectedRequest.task_name}</strong> ({selectedRequest.assignments.length}/{selectedRequest.episodes_requested} assigned)</p>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="btn-secondary">Close</button>
            </div>

            {/* Episode Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <input
                type="text"
                placeholder="Filter by Task Name..."
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
              />
              <select value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)}>
                <option value="">All Quality Types</option>
                <option value="good">Good Only</option>
                <option value="usable">Usable Only</option>
                <option value="bad">Bad (Non-assignable)</option>
              </select>
            </div>

            {/* Episode Table */}
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead style={{ background: 'rgba(15, 23, 42, 0.9)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>Episode ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Task</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Robot</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Quality</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEpisodes.map((ep) => {
                    const isAlreadyAssigned = ep.is_assigned;
                    const isGoodOrUsable = ep.quality === 'good' || ep.quality === 'usable';

                    return (
                      <tr key={ep.episode_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>{ep.episode_id}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{ep.task_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{ep.robot_id}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge badge-${ep.quality}`}>{ep.quality}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{ep.duration_seconds}s</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          {isAlreadyAssigned ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Assigned</span>
                          ) : !isGoodOrUsable ? (
                            <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Quality Guard</span>
                          ) : (
                            <button
                              onClick={() => handleAssignEpisode(ep.episode_id)}
                              className="btn-primary"
                              disabled={isAssigning}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              Assign
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
