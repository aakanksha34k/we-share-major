import { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import './BorrowModal.css';

const TYPES = ['Notes', 'PDFs', 'E-Books', 'Question Papers', 'Other'];

export default function UploadResourceModal({ onClose, onDone }) {
  const [form, setForm] = useState({ title: '', type: 'Notes', subject: '', description: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.subject.trim()) return setError('Title and subject are required.');
    if (!file) return setError('Please choose a file.');
    if (file.size > 10 * 1024 * 1024) return setError('File must be 10 MB or smaller.');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('file', file);

    setBusy(true);
    try {
      const { data } = await api.post('/digital', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onDone(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="bm-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="bm-dialog" role="dialog" aria-modal="true">
        <div className="bm-header">
          <div><h2>Upload a resource</h2><p>Notes, PDFs, e-books or question papers. No photos needed.</p></div>
          <button type="button" className="bm-close" onClick={onClose} disabled={busy} aria-label="Close">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="bm-field"><label>Title</label>
            <input value={form.title} onChange={set('title')} maxLength={150} placeholder="e.g. DBMS Unit 3 Notes" /></div>
          <div className="bm-field"><label>Type</label>
            <select value={form.type} onChange={set('type')} style={{ width: '100%', padding: 11, borderRadius: 8, border: '1.5px solid #dfe6e9' }}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="bm-field"><label>Subject</label>
            <input value={form.subject} onChange={set('subject')} maxLength={80} placeholder="e.g. Computer Science" /></div>
          <div className="bm-field"><label>Description (optional)</label>
            <textarea rows={3} value={form.description} onChange={set('description')} maxLength={1000} /></div>
          <div className="bm-field"><label>File</label>
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.epub" onChange={(e) => setFile(e.target.files[0] || null)} />
            <p className="bm-help">PDF, DOC/DOCX, PPT/PPTX, TXT or EPUB. Max 10 MB. Only upload material you're allowed to share.</p></div>
          {error && <div className="bm-error" role="alert">{error}</div>}
          <div className="bm-actions">
            <button type="button" className="bm-btn bm-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="bm-btn bm-btn--primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}