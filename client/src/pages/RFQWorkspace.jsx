import React, { useState, useEffect } from 'react';

export default function RFQWorkspace() {
	const [rfqs, setRfqs] = useState([]);
	const [newRFQTitle, setNewRFQTitle] = useState('');
	const [newRFQDesc, setNewRFQDesc] = useState('');
	const [selectedTemplate, setSelectedTemplate] = useState('standard');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/rfqs');
				const data = await res.json();
				setRfqs(Array.isArray(data) ? data : []);
			} catch (e) {
				console.error('Error fetching RFQs:', e);
			}
		})();
	}, []);

	const handleCreateRFQ = async (e) => {
		e.preventDefault();
		if (!newRFQTitle.trim()) return;

		try {
			const response = await fetch('/api/rfqs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newRFQTitle,
					description: newRFQDesc,
					template: selectedTemplate
				})
			});
			if (response.ok) {
				setNewRFQTitle('');
				setNewRFQDesc('');
				window.location.reload();
			}
		} catch (error) {
			console.error('Error creating RFQ:', error);
		}
	};

	const mockRFQs = [
		{ id: 1, title: 'Office Supplies 2025', status: 'Draft', created: '2025-01-10', supplier_count: 0 },
		{ id: 2, title: 'IT Equipment Procurement', status: 'Published', created: '2025-01-08', supplier_count: 5 },
		{ id: 3, title: 'Consulting Services RFQ', status: 'Evaluation', created: '2025-01-05', supplier_count: 3 }
	];

	return (
		<div style={{ padding: '30px' }}>
					<h1>📋 RFQ Workspace</h1>
					<p>Create and edit RFQs, attach documents, and publish to suppliers.</p>

					<section style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
						<h3>Create New RFQ</h3>
						<form onSubmit={handleCreateRFQ}>
							<div style={{ marginBottom: '15px' }}>
								<label><strong>RFQ Title *</strong></label>
								<input
									type="text"
									placeholder="e.g., Office Equipment Q1 2025"
									value={newRFQTitle}
									onChange={(e) => setNewRFQTitle(e.target.value)}
									required
									style={{ padding: '8px', width: '100%', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
								/>
							</div>
							<div style={{ marginBottom: '15px' }}>
								<label>Description</label>
								<textarea
									placeholder="Brief description of the RFQ..."
									value={newRFQDesc}
									onChange={(e) => setNewRFQDesc(e.target.value)}
									style={{ padding: '8px', width: '100%', minHeight: '80px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
								/>
							</div>
							<div style={{ marginBottom: '15px' }}>
								<label><strong>Template</strong></label>
								<select
									value={selectedTemplate}
									onChange={(e) => setSelectedTemplate(e.target.value)}
									style={{ padding: '8px', width: '100%', maxWidth: '300px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
								>
									<option value="standard">Standard RFQ</option>
									<option value="technical">Technical Specification RFQ</option>
									<option value="financial">Financial Only RFQ</option>
									<option value="custom">Custom Template</option>
								</select>
							</div>
							<button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
								Create RFQ
							</button>
						</form>
					</section>

					<section style={{ marginTop: '30px' }}>
						<h3>RFQ List</h3>
						{mockRFQs.length === 0 ? (
							<p>No RFQs yet. Create one to get started.</p>
						) : (
							<table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
								<thead>
									<tr style={{ background: '#f5f5f5' }}>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>RFQ Title</th>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Created</th>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Suppliers</th>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{mockRFQs.map((rfq) => (
										<tr key={rfq.id} style={{ borderBottom: '1px solid #ddd' }}>
											<td style={{ padding: '10px' }}>{rfq.title}</td>
											<td style={{ padding: '10px' }}>
												<span style={{
													background: rfq.status === 'Published' ? '#d4edda' : rfq.status === 'Draft' ? '#fff3cd' : '#e7d4f5',
													padding: '4px 8px',
													borderRadius: '4px',
													fontSize: '12px'
												}}>
													{rfq.status}
												</span>
											</td>
											<td style={{ padding: '10px' }}>{rfq.created}</td>
											<td style={{ padding: '10px' }}>{rfq.supplier_count}</td>
											<td style={{ padding: '10px' }}>
												<button style={{ padding: '4px 8px', marginRight: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
												<button style={{ padding: '4px 8px', marginRight: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Publish</button>
												<button style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</section>
		</div>
	);
}

