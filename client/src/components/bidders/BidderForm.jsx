// BidderForm.jsx
import React, { useState } from 'react';

export default function BidderForm({ onSubmit, initialData = {} }) {
  const [form, setForm] = useState({
    name: initialData.name || '',
    address: initialData.address || '',
    contact: initialData.contact || '',
    status: initialData.status || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name:</label>
        <input name="name" value={form.name} onChange={handleChange} required />
      </div>
      <div>
        <label>Address:</label>
        <input name="address" value={form.address} onChange={handleChange} />
      </div>
      <div>
        <label>Contact:</label>
        <input name="contact" value={form.contact} onChange={handleChange} />
      </div>
      <div>
        <label>Status:</label>
        <input name="status" value={form.status} onChange={handleChange} />
      </div>
      <button type="submit">Save Bidder</button>
    </form>
  );
}
