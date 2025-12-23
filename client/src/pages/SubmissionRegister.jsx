import React, { useState } from 'react';

export default function SubmissionRegister() {
	const [submissions, setSubmissions] = useState([]);
	const [supplierName, setSupplierName] = useState('');
	const [submissionDate, setSubmissionDate] = useState('');
	const [rfqId, setRfqId] = useState('');
	const [isLocked, setIsLocked] = useState(false);

	const handleAddSubmission = async (e) => {
		e.preventDefault();
		if (!supplierName.trim() || !submissionDate) return;

		try {
			const response = await fetch('/api/submissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ supplier: supplierName, submittedAt: submissionDate, rfqId })
			});
			if (response.ok) {
				setSupplierName('');
				setSubmissionDate('');
				window.location.reload();
			}
		} catch (error) {
			console.error('Error adding submission:', error);
		}
	};

	const handleLockSubmissions = async () => {
		try {
			const response = await fetch('/api/submissions/lock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			if (response.ok) {
				setIsLocked(true);
			}
		} catch (error) {
			console.error('Error locking submissions:', error);
		}
	};

	const mockSubmissions = [
		{ id: 1, supplier: 'ABC Suppliers', timestamp: '2025-01-10 09:15:22', rfq: 'RFQ-2025-001', status: 'Received' },
		{ id: 2, supplier: 'Tech Solutions', timestamp: '2025-01-10 10:45:00', rfq: 'RFQ-2025-001', status: 'Received' },
		{ id: 3, supplier: 'Global Traders', timestamp: '2025-01-10 14:20:15', rfq: 'RFQ-2025-001', status: 'Received' },
		{ id: 4, supplier: 'Premium Services', timestamp: '2025-01-10 15:55:30', rfq: 'RFQ-2025-002', status: 'Received' }
	];

	return (
		<div style={{ padding: '30px' }}>
					<h1>📋 Submission Register</h1>
					<p>Record and timestamp submissions, track participants, and lock submissions at close.</p>

					{isLocked && (
						<div style={{ padding: '15px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', marginTop: '20px', marginBottom: '20px' }}>
							🔒 <strong>Submissions are LOCKED</strong> - No further submissions can be accepted.
						</div>
					)}

					<section style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
						<h3>Record New Submission</h3>
						{isLocked ? (
							<p style={{ color: '#dc3545' }}>Submissions are locked. Cannot accept new submissions.</p>
						) : (
							<form onSubmit={handleAddSubmission}>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
									<div>
										<label>Supplier Name:</label>
										<input
											type="text"
											placeholder="Company name"
											value={supplierName}
											onChange={(e) => setSupplierName(e.target.value)}
											style={{ padding: '8px', width: '100%', marginTop: '5px' }}
										/>
									</div>
									<div>
										<label>Submission Time:</label>
										<input
											type="datetime-local"
											value={submissionDate}
											onChange={(e) => setSubmissionDate(e.target.value)}
											style={{ padding: '8px', width: '100%', marginTop: '5px' }}
										/>
									</div>
								</div>
								<button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
									Record Submission
								</button>
							</form>
						)}
					</section>

					<section style={{ marginTop: '30px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
							<h3>Submissions Log ({mockSubmissions.length})</h3>
							{!isLocked && (
								<button onClick={handleLockSubmissions} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
									🔒 Lock Submissions
								</button>
							)}
						</div>
						<table style={{ width: '100%', borderCollapse: 'collapse' }}>
							<thead>
								<tr style={{ background: '#f5f5f5' }}>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Supplier</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Submission Time</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>RFQ ID</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
								</tr>
							</thead>
							<tbody>
								{mockSubmissions.map((sub) => (
									<tr key={sub.id} style={{ borderBottom: '1px solid #ddd' }}>
										<td style={{ padding: '10px' }}>{sub.supplier}</td>
										<td style={{ padding: '10px' }}>{sub.timestamp}</td>
										<td style={{ padding: '10px' }}>{sub.rfq}</td>
										<td style={{ padding: '10px' }}><span style={{ background: '#d4edda', padding: '4px 8px', borderRadius: '4px' }}>✓ {sub.status}</span></td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
		</div>
	);
}

