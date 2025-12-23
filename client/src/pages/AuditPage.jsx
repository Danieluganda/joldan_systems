import React, { useState } from 'react';

export default function AuditPage() {
	const [selectedProcurement, setSelectedProcurement] = useState(null);
	const [includeDocuments, setIncludeDocuments] = useState(true);
	const [includeApprovals, setIncludeApprovals] = useState(true);
	const [includeEvaluations, setIncludeEvaluations] = useState(true);
	const [generating, setGenerating] = useState(false);

	const mockProcurements = [
		{
			id: 1,
			name: 'Office Equipment Q1 2025',
			status: 'Completed',
			startDate: '2025-01-01',
			endDate: '2025-02-15',
			documentsCount: 12,
			approvalsCount: 5,
			evaluationsCount: 3
		},
		{
			id: 2,
			name: 'IT Infrastructure Upgrade',
			status: 'Active',
			startDate: '2025-01-10',
			endDate: '2025-03-30',
			documentsCount: 8,
			approvalsCount: 3,
			evaluationsCount: 2
		},
		{
			id: 3,
			name: 'Consulting Services',
			status: 'Planning',
			startDate: '2025-02-01',
			endDate: '2025-04-15',
			documentsCount: 4,
			approvalsCount: 1,
			evaluationsCount: 0
		}
	];

	const handleGeneratePack = async () => {
		if (!selectedProcurement) {
			alert('Please select a procurement');
			return;
		}

		setGenerating(true);
		try {
			const response = await fetch('/api/audits/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					procurementId: selectedProcurement,
					includeDocuments,
					includeApprovals,
					includeEvaluations
				})
			});
			if (response.ok) {
				const data = await response.json();
				// Trigger download
				const element = document.createElement('a');
				element.href = data.downloadUrl;
				element.download = data.filename;
				document.body.appendChild(element);
				element.click();
				document.body.removeChild(element);
			}
		} catch (error) {
			console.error('Error generating audit pack:', error);
		} finally {
			setGenerating(false);
		}
	};

	const selectedProc = mockProcurements.find(p => p.id === selectedProcurement);

	return (
		<div style={{ padding: '30px' }}>
					<h1>📦 Audit Pack</h1>
					<p>Generate and download audit-ready packs containing procurement history, documents, and approvals.</p>

					<section style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
						{/* Left: Procurement Selection */}
						<div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
							<h3>Select Procurement</h3>
							<div style={{ marginTop: '15px' }}>
								{mockProcurements.map((proc) => (
									<div
										key={proc.id}
										onClick={() => setSelectedProcurement(proc.id)}
										style={{
											padding: '15px',
											border: selectedProcurement === proc.id ? '2px solid #007bff' : '1px solid #eee',
											borderRadius: '4px',
											marginBottom: '10px',
											background: selectedProcurement === proc.id ? '#e7f3ff' : '#fafafa',
											cursor: 'pointer'
										}}
									>
										<h4 style={{ margin: '0 0 5px 0' }}>{proc.name}</h4>
										<p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
											Status: <strong>{proc.status}</strong> | {proc.startDate} to {proc.endDate}
										</p>
									</div>
								))}
							</div>
						</div>

						{/* Right: Pack Configuration */}
						<div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
							<h3>Configure Pack</h3>
							{selectedProc ? (
								<div style={{ marginTop: '15px' }}>
									<div style={{ marginBottom: '20px', padding: '15px', background: '#f0f8ff', borderRadius: '4px' }}>
										<h4 style={{ margin: '0 0 10px 0' }}>{selectedProc.name}</h4>
										<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
											<div>
												<p style={{ margin: '0', fontSize: '12px', color: '#666' }}>DOCUMENTS</p>
												<p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px' }}>{selectedProc.documentsCount}</p>
											</div>
											<div>
												<p style={{ margin: '0', fontSize: '12px', color: '#666' }}>APPROVALS</p>
												<p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px' }}>{selectedProc.approvalsCount}</p>
											</div>
											<div>
												<p style={{ margin: '0', fontSize: '12px', color: '#666' }}>EVALUATIONS</p>
												<p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px' }}>{selectedProc.evaluationsCount}</p>
											</div>
										</div>
									</div>

									<h4>Include in Pack:</h4>
									<label style={{ display: 'block', marginBottom: '10px', cursor: 'pointer' }}>
										<input
											type="checkbox"
											checked={includeDocuments}
											onChange={(e) => setIncludeDocuments(e.target.checked)}
											style={{ marginRight: '8px' }}
										/>
										All Documents & Versions
									</label>
									<label style={{ display: 'block', marginBottom: '10px', cursor: 'pointer' }}>
										<input
											type="checkbox"
											checked={includeApprovals}
											onChange={(e) => setIncludeApprovals(e.target.checked)}
											style={{ marginRight: '8px' }}
										/>
										Approval Trail & Signatures
									</label>
									<label style={{ display: 'block', marginBottom: '20px', cursor: 'pointer' }}>
										<input
											type="checkbox"
											checked={includeEvaluations}
											onChange={(e) => setIncludeEvaluations(e.target.checked)}
											style={{ marginRight: '8px' }}
										/>
										Evaluation Reports & Scores
									</label>

									<button
										onClick={handleGeneratePack}
										disabled={generating}
										style={{
											padding: '10px 20px',
											background: '#28a745',
											color: 'white',
											border: 'none',
											borderRadius: '4px',
											cursor: 'pointer',
											width: '100%',
											fontWeight: 'bold',
											opacity: generating ? 0.6 : 1
										}}
									>
										{generating ? '⏳ Generating...' : '📥 Generate & Download Pack'}
									</button>
								</div>
							) : (
								<p style={{ color: '#666' }}>Select a procurement to configure the audit pack.</p>
							)}
						</div>
					</section>

					{/* Audit History */}
					<section style={{ marginTop: '40px' }}>
						<h3>Recent Audit Packs</h3>
						<table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
							<thead>
								<tr style={{ background: '#f5f5f5' }}>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Procurement</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Generated By</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Size</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								<tr style={{ borderBottom: '1px solid #ddd' }}>
									<td style={{ padding: '10px' }}>Office Equipment Q1 2025</td>
									<td style={{ padding: '10px' }}>John Smith</td>
									<td style={{ padding: '10px' }}>2025-02-15</td>
									<td style={{ padding: '10px' }}>12.5 MB</td>
									<td style={{ padding: '10px' }}>
										<button style={{ padding: '4px 8px', marginRight: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Download</button>
										<button style={{ padding: '4px 8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>View</button>
									</td>
								</tr>
							</tbody>
						</table>
					</section>
		</div>
	);
}

