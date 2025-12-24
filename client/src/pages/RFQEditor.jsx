// client/src/pages/RFQEditor.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function RFQEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', status: 'draft' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    fetch(`/api/rfqs/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setForm({
        title: data.title || '',
        description: data.description || '',
        status: data.status || 'draft',
      }))
      .catch(() => setError('Failed to load RFQ.'))
      .finally(() => setLoading(false));
  }, [id]);

  function validate() {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.description.trim()) return 'Description is required.';
    return '';
  }

  async function save() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(id ? `/api/rfqs/${id}` : '/api/rfqs', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await res.json();
        navigate('/rfqs');
      } else {
        const err = await res.text();
        setError('Save failed: ' + err);
      }
    } catch (e) {
      setError('Network error');
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>{id ? 'Edit RFQ' : 'New RFQ'}</h1>
      {loading && <p>Loading...</p>}
      {error && <div style={{ color: '#dc3545', marginBottom: 12 }}>{error}</div>}
      <div style={{ maxWidth: 600 }}>
        <label>Title<br />
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            style={{ width: '100%' }}
            disabled={loading}
            maxLength={100}
            placeholder="Enter RFQ title"
          />
        </label>
        <br /><br />
        <label>Description<br />
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ width: '100%', height: 120 }}
            disabled={loading}
            maxLength={1000}
            placeholder="Describe the RFQ..."
          />
        </label>
        <br /><br />
        <label>Status &nbsp;
          <select
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
            disabled={loading}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <br /><br />
        <button onClick={save} disabled={loading} style={{ minWidth: 120 }}>
          {loading ? (id ? 'Updating...' : 'Creating...') : (id ? 'Update RFQ' : 'Create RFQ')}
        </button>
        <button onClick={() => navigate('/rfqs')} style={{ marginLeft: 8 }} disabled={loading}>Cancel</button>
      </div>
    </div>
  );
}
