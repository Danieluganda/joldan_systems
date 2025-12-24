import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NoObjectionPage = ({ procurementId }) => {
  const [requests, setRequests] = useState([]);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('pending');
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (procurementId) {
      axios.get(`/api/noObjections/procurement/${procurementId}`)
        .then(res => setRequests(res.data))
        .catch(() => setRequests([]));
    }
  }, [procurementId]);

  const submitRequest = async () => {
    try {
      await axios.post('/api/noObjections', { procurementId, reason });
      setReason('');
      setStatus('pending');
      setComment('');
      setSelectedId(null);
      // Refresh list
      const res = await axios.get(`/api/noObjections/procurement/${procurementId}`);
      setRequests(res.data);
    } catch (err) {
      alert('Error submitting request');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/api/noObjections/${id}/status`, { status: newStatus });
      const res = await axios.get(`/api/noObjections/procurement/${procurementId}`);
      setRequests(res.data);
    } catch (err) {
      alert('Error updating status');
    }
  };

  const addComment = async (id) => {
    try {
      await axios.post(`/api/noObjections/${id}/comment`, { comment });
      setComment('');
      const res = await axios.get(`/api/noObjections/procurement/${procurementId}`);
      setRequests(res.data);
    } catch (err) {
      alert('Error adding comment');
    }
  };

  return (
    <div className="no-objection-page">
      <h2>No-Objection Requests</h2>
      <div>
        <input
          type="text"
          placeholder="Reason for request"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <button onClick={submitRequest}>Submit Request</button>
      </div>
      <ul>
        {requests.map(req => (
          <li key={req._id}>
            <strong>Status:</strong> {req.status} <br />
            <strong>Reason:</strong> {req.reason} <br />
            <strong>Comments:</strong>
            <ul>
              {req.comments.map((c, idx) => (
                <li key={idx}>{c.text} ({c.user?.name || 'User'})</li>
              ))}
            </ul>
            <button onClick={() => updateStatus(req._id, 'approved')}>Approve</button>
            <button onClick={() => updateStatus(req._id, 'rejected')}>Reject</button>
            <input
              type="text"
              placeholder="Add comment"
              value={selectedId === req._id ? comment : ''}
              onChange={e => {
                setSelectedId(req._id);
                setComment(e.target.value);
              }}
            />
            <button onClick={() => addComment(req._id)}>Add Comment</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NoObjectionPage;
