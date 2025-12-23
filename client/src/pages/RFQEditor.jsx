// client/src/pages/RFQEditor.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function RFQEditor(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:'', description:'', status:'draft' });
  const [loading, setLoading] = useState(false);
  useEffect(()=>{
    if(!id) return;
    setLoading(true);
    fetch(`/api/rfqs/${id}`)
      .then(r=> r.json())
      .then(data => setForm({ title: data.title||'', description: data.description||'', status: data.status||'draft' }))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[id]);

  async function save(){
    setLoading(true);
    try{
      const res = await fetch(id?`/api/rfqs/${id}`:'/api/rfqs',{
        method: id? 'PUT' : 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(form)
      });
      if(res.ok){
        const data = await res.json();
        navigate('/rfqs');
      } else {
        const err = await res.text();
        alert('Save failed: '+err);
      }
    }catch(e){ alert('Network error'); }
    setLoading(false);
  }

  return (
    <div style={{padding:20}}>
      <h1>{id? 'Edit RFQ' : 'New RFQ'}</h1>
      {loading && <p>Loading...</p>}
      <div style={{maxWidth:600}}>
        <label>Title<br/>
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{width:'100%'}} />
        </label>
        <br/><br/>
        <label>Description<br/>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{width:'100%',height:120}} />
        </label>
        <br/><br/>
        <label>Status &nbsp;
          <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <br/><br/>
        <button onClick={save} disabled={loading}>{id? 'Update RFQ' : 'Create RFQ'}</button>
        <button onClick={()=>navigate('/rfqs')} style={{marginLeft:8}}>Cancel</button>
      </div>
    </div>
  );
}
