import { useRef, useState } from 'react';
import api from '../api';
import '../pages/DigitalExtras.css';

export const UPLOAD_TYPES = ['Notes', 'E-Books', 'Question Papers', 'Other'];
const MAX_MB = 15; // keep in sync with MAX_FILE_MB in server/controllers/digitalController.js

export const formatSize = (bytes) => {
  const n = Number(bytes || 0);
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

function DigitalUploadModal({ onClose, onUploaded, defaultType = 'Notes' }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState(UPLOAD_TYPES.includes(defaultType) ? defaultType : 'Notes');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [rights, setRights] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const pickFile = (picked) => {
    if (!picked) return;
    setError('');

    const isPdf = picked.type === 'application/pdf' || /\.pdf$/i.test(picked.name);
    if (!isPdf) {
      setError('Only PDF files can be uploaded.');
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setError(`That PDF is ${formatSize(picked.size)}. The limit is ${MAX_MB} MB.`);
      return;
    }

    setFile(picked);
    if (!title.trim()) {
      setTitle(picked.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');

    if (!file) return setError('Choose a PDF file to upload.');
    if (title.trim().length < 3) return setError('Give the resource a title of at least 3 characters.');
    if (!subject.trim()) return setError('Add the subject or course, so others can find it.');
    if (!rights) return setError('Confirm that you have the right to share this file.');

    const form = new FormData();
    form.append('title', title.trim());
    form.append('type', type);
    form.append('subject', subject.trim());
    form.append('description', description.trim());
    form.append('rights', 'true');
    form.append('file', file); // keep the file last

    try {
      setBusy(true);
      setProgress(0);
      const { data } = await api.post('/digital', form, {
        // The shared axios instance defaults to JSON; without this it would JSON-encode the form.
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
        }
      });
      onUploaded(data.resource, data.message);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.code === 'ECONNABORTED'
            ? 'The upload took too long. Check your connection and try again.'
            : 'Upload failed. Please try again.')
      );
      setBusy(false);
    }
  };

  return (
    <div className="dd-overlay" role="dialog" aria-modal="true" aria-labelledby="dd-upload-title">
      <div className="dd-dialog">
        <div className="dd-dialog-head">
          <div>
            <h2 id="dd-upload-title">Upload a resource</h2>
            <p>Share notes, e-books or past papers with every student. No approval needed.</p>
          </div>
          <button type="button" className="dd-close" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <div
            className={`dd-drop ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => !busy && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!busy) pickFile(e.dataTransfer.files?.[0]);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }}
            />
            {file ? (
              <>
                <strong>📄 {file.name}</strong>
                <span>{formatSize(file.size)}. Click to choose a different file.</span>
              </>
            ) : (
              <>
                <strong>Drop a PDF here, or click to browse</strong>
                <span>PDF only, up to {MAX_MB} MB</span>
              </>
            )}
          </div>

          <div className="dd-field">
            <label htmlFor="dd-title">Title</label>
            <input
              id="dd-title" type="text" maxLength={120} value={title} disabled={busy}
              placeholder="e.g. Operating Systems, Unit 3 notes"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="dd-row">
            <div className="dd-field">
              <label htmlFor="dd-type">Type</label>
              <select id="dd-type" value={type} disabled={busy} onChange={(e) => setType(e.target.value)}>
                {UPLOAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="dd-field">
              <label htmlFor="dd-subject">Subject or course</label>
              <input
                id="dd-subject" type="text" maxLength={80} value={subject} disabled={busy}
                placeholder="e.g. Computer Science"
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          <div className="dd-field">
            <label htmlFor="dd-desc">Description <span>(optional)</span></label>
            <textarea
              id="dd-desc" rows={3} maxLength={1000} value={description} disabled={busy}
              placeholder="Syllabus covered, edition, exam year, anything that helps others pick the right file."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <label className="dd-check">
            <input type="checkbox" checked={rights} disabled={busy} onChange={(e) => setRights(e.target.checked)} />
            <span>
              I made this, or I have the right to share it. I understand that copyrighted
              material can be removed.
            </span>
          </label>

          {error && <div className="dd-error" role="alert">{error}</div>}

          {busy && (
            <div className="dd-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${progress}%` }} />
              <span>{progress < 100 ? `Uploading ${progress}%` : 'Saving…'}</span>
            </div>
          )}

          <div className="dd-actions">
            <button type="button" className="dd-btn dd-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="dd-btn dd-btn--primary" disabled={busy}>
              {busy ? 'Uploading…' : 'Upload PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DigitalUploadModal;
