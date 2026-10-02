import React, { useState } from 'react';
import { ImportReport } from '../types';
import { apiFetch } from '../api/client';
import { Upload, FileSpreadsheet, CheckCircle2, AlertOctagon, FileCode, Check, RefreshCw } from 'lucide-react';

export const CSVImportView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else if (csvText) {
        formData.append('csv_text', csvText);
      } else {
        throw new Error('Please select a file or paste CSV text');
      }

      const resReport = await apiFetch<ImportReport>('/episodes/import', {
        method: 'POST',
        body: formData,
      });

      setReport(resReport);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem 3rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Episode Metadata CSV Importer</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Import recording session metadata into the platform with safe, idempotent processing
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Upload Form Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={20} color="var(--primary)" /> Select CSV Source
          </h3>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Upload `.csv` File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                    setCsvText('');
                  }
                }}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>

            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700' }}>
              — OR PASTE RAW CSV —
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Paste CSV Text Content
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setFile(null);
                }}
                placeholder="episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality..."
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isUploading} style={{ justifyContent: 'center', padding: '0.75rem' }}>
              {isUploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
              {isUploading ? 'Processing Import...' : 'Run Idempotent Import'}
            </button>
          </form>
        </div>

        {/* Instructions & Known Rules Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCode size={20} color="var(--secondary)" /> Import Handling & Validation Rules
          </h3>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Check size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span><strong>Idempotency:</strong> Safe to run multiple times. Duplicate <code>episode_id</code> records are safely skipped without throwing errors.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Check size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span><strong>Robot Registry:</strong> Validates against known robots (<code>arm-01</code>, <code>arm-02</code>, <code>arm-03</code>, <code>mobile-01</code>, <code>humanoid-01</code>).</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Check size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span><strong>Timestamp Sanitization:</strong> Normalizes ISO 8601, slash-formatted, and standard date strings automatically.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Check size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span><strong>Quality Categorization:</strong> Normalizes casing for <code>good</code>, <code>usable</code>, and <code>bad</code>.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Import Report Card */}
      {report && (
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={24} color="#4ade80" /> Import Execution Summary
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '700' }}>TOTAL PROCESSED</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem' }}>{report.total_rows_processed}</div>
            </div>
            
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: '700' }}>IMPORTED NEW</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#4ade80', marginTop: '0.25rem' }}>{report.imported_count}</div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '700' }}>DUPLICATES SKIPPED</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.25rem' }}>{report.duplicate_count}</div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '700' }}>SKIPPED / INVALID</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f87171', marginTop: '0.25rem' }}>{report.skipped_count}</div>
            </div>
          </div>

          {/* Skip Reasons Breakdown */}
          {report.skip_reasons.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertOctagon size={16} color="#f87171" /> Skipped Rows Audit Log
              </h4>

              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead style={{ background: 'rgba(15, 23, 42, 0.9)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '0.65rem 1rem' }}>Row #</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Episode ID</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Skip Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.skip_reasons.map((sr, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)' }}>{sr.row_number}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: '700' }}>{sr.episode_id || 'N/A'}</td>
                        <td style={{ padding: '0.65rem 1rem', color: '#f87171' }}>{sr.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
