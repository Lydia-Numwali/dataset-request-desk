import React, { useState, useEffect } from 'react';
import { AnalyticsData } from '../types';
import { apiFetch } from '../api/client';
import { BarChart3, Clock, Trophy, Calendar, Bot, RefreshCw } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      let query = '';
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', new Date(startDate).toISOString());
      if (endDate) params.append('end_date', new Date(endDate).toISOString());
      
      if (params.toString()) {
        query = `?${params.toString()}`;
      }

      const data = await apiFetch<AnalyticsData>(`/analytics${query}`);
      setAnalytics(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading && !analytics) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading analytics metrics...</div>;
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 1rem 3rem' }}>
      
      {/* Header & Date Range Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Platform Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>SQL Database-enforced aggregations and teleoperation performance metrics</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Calendar size={14} color="var(--text-muted)" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '0.2rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '0.2rem', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
            />
          </div>
          <button onClick={fetchAnalytics} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
            <RefreshCw size={14} /> Filter
          </button>
        </div>
      </div>

      {analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* Median Time Card */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={32} color="#c084fc" />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>MEDIAN DELIVERED TIME</div>
                <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'white', marginTop: '0.1rem' }}>
                  {analytics.request_fulfilment.median_time_to_delivery_hours !== undefined
                    ? `${analytics.request_fulfilment.median_time_to_delivery_hours} hrs`
                    : 'N/A'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                  From Submitted to Delivered status
                </div>
              </div>
            </div>

            {/* Request Fulfilment Status Counts */}
            <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                REQUEST STATUS FULFILMENT BREAKDOWN
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
                {analytics.request_fulfilment.status_counts.map((sc) => (
                  <div key={sc.status} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.65rem', textAlign: 'center' }}>
                    <span className={`badge badge-${sc.status}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                      {sc.status.replace('_', ' ')}
                    </span>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '0.35rem' }}>{sc.count}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Middle Section: Top 5 Tasks & Daily Robot Counts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem' }}>
            
            {/* Top 5 Task Names by Good Episodes */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={20} color="#fbbf24" /> Top 5 Tasks by Good Episodes
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analytics.top_5_tasks_by_good_episodes.map((task, idx) => {
                  const maxCount = analytics.top_5_tasks_by_good_episodes[0]?.good_episodes_count || 1;
                  const pct = Math.round((task.good_episodes_count / maxCount) * 100);

                  return (
                    <div key={task.task_name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                        <span>#{idx + 1} {task.task_name}</span>
                        <span style={{ color: '#4ade80' }}>{task.good_episodes_count} good episodes</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, #4ade80 100%)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Episodes per Robot Table */}
            <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot size={20} color="var(--primary)" /> Episodes Recorded Per Day Per Robot
              </h3>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead style={{ background: 'rgba(15, 23, 42, 0.9)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '0.65rem 1rem' }}>Date</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Robot ID</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Episodes Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.episodes_per_day_per_robot.slice(0, 100).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)' }}>{row.record_date}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: '600' }}>{row.robot_id}</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: '700', color: 'var(--primary)' }}>
                          {row.episode_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
