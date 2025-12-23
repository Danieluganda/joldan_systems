import React, { useState } from 'react';
import { useProcurement } from '../hooks/useProcurement';

export default function PlanningPage() {
	const { procurements, loading } = useProcurement();
	const [newPlanName, setNewPlanName] = useState('');
	const [uploadFile, setUploadFile] = useState(null);

	const handleCreatePlan = async (e) => {
		e.preventDefault();
		if (!newPlanName.trim()) return;

		try {
			const response = await fetch('/api/plans', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newPlanName })
			});
			if (response.ok) {
				setNewPlanName('');
				window.location.reload();
			}
		} catch (error) {
			console.error('Error creating plan:', error);
		}
	};

	const handleUploadPlan = async (e) => {
		e.preventDefault();
		if (!uploadFile) return;

		const formData = new FormData();
		formData.append('file', uploadFile);

		try {
			const response = await fetch('/api/plans/upload', {
				method: 'POST',
				body: formData
			});
			if (response.ok) {
				setUploadFile(null);
				window.location.reload();
			}
		} catch (error) {
			console.error('Error uploading plan:', error);
		}
	};

	return (
		<div style={{ padding: '30px' }}>
					<h1>📋 Procurement Planning</h1>
					<p>Upload or create procurement plans, assign milestones, and map to procurement activities.</p>

					<section style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
						<h3>Create New Plan</h3>
						<form onSubmit={handleCreatePlan}>
							<input
								type="text"
								placeholder="Plan Name (e.g., Q1 2025 Procurement)"
								value={newPlanName}
								onChange={(e) => setNewPlanName(e.target.value)}
								style={{ padding: '8px', width: '300px', marginRight: '10px' }}
							/>
							<button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
								Create Plan
							</button>
						</form>
					</section>

					<section style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
						<h3>Upload Existing Plan</h3>
						<form onSubmit={handleUploadPlan}>
							<input
								type="file"
								accept=".xlsx,.xls,.pdf,.doc,.docx"
								onChange={(e) => setUploadFile(e.target.files[0])}
								style={{ marginRight: '10px' }}
							/>
							<button type="submit" disabled={!uploadFile} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
								Upload
							</button>
						</form>
					</section>

					<section style={{ marginTop: '30px' }}>
						<h3>Active Plans</h3>
						{loading ? (
							<p>Loading...</p>
						) : procurements.length === 0 ? (
							<p>No plans yet. Create or upload one to get started.</p>
						) : (
							<table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
								<thead>
									<tr style={{ background: '#f5f5f5' }}>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Plan Name</th>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Created</th>
										<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{procurements.map((plan) => (
										<tr key={plan.id} style={{ borderBottom: '1px solid #ddd' }}>
											<td style={{ padding: '10px' }}>{plan.name}</td>
											<td style={{ padding: '10px' }}><span style={{ background: '#d4edda', padding: '4px 8px', borderRadius: '4px' }}>{plan.status || 'Draft'}</span></td>
											<td style={{ padding: '10px' }}>{new Date(plan.createdAt).toLocaleDateString()}</td>
											<td style={{ padding: '10px' }}>
												<button style={{ padding: '4px 8px', marginRight: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
												<button style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
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

