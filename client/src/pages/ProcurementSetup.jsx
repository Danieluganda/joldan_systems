import React, { useState } from 'react';

export default function ProcurementSetup() {
	const [procurementName, setProcurementName] = useState('');
	const [procurementType, setProcurementType] = useState('goods');
	const [budget, setBudget] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [description, setDescription] = useState('');

	const procurementTypes = [
		{ value: 'goods', label: 'Goods/Products' },
		{ value: 'services', label: 'Services' },
		{ value: 'works', label: 'Works/Construction' },
		{ value: 'consulting', label: 'Consulting' }
	];

	const handleCreateProcurement = async (e) => {
		e.preventDefault();
		if (!procurementName.trim() || !budget || !startDate || !endDate) {
			alert('Please fill in all required fields');
			return;
		}

		try {
			const response = await fetch('/api/procurements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: procurementName,
					type: procurementType,
					budget: parseFloat(budget),
					startDate,
					endDate,
					description
				})
			});
			if (response.ok) {
				alert('Procurement created successfully!');
				// Reset form
				setProcurementName('');
				setDescription('');
				setBudget('');
				setStartDate('');
				setEndDate('');
			}
		} catch (error) {
			console.error('Error creating procurement:', error);
		}
	};

	return (
		<div style={{ padding: '30px' }}>
					<h1>➕ New Procurement</h1>
					<p>Start a new procurement: select template, set timeline, assign roles, and create initial documents.</p>

					<section style={{ marginTop: '30px', padding: '30px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
						<h3>Create New Procurement</h3>
						<form onSubmit={handleCreateProcurement}>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
								<div>
									<label><strong>Procurement Name *</strong></label>
									<input
										type="text"
										placeholder="e.g., Office Equipment Q1 2025"
										value={procurementName}
										onChange={(e) => setProcurementName(e.target.value)}
										required
										style={{ padding: '10px', width: '100%', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
									/>
								</div>
								<div>
									<label><strong>Procurement Type *</strong></label>
									<select
										value={procurementType}
										onChange={(e) => setProcurementType(e.target.value)}
										style={{ padding: '10px', width: '100%', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
									>
										{procurementTypes.map((type) => (
											<option key={type.value} value={type.value}>{type.label}</option>
										))}
									</select>
								</div>
								<div>
									<label><strong>Total Budget ($) *</strong></label>
									<input
										type="number"
										placeholder="100000"
										value={budget}
										onChange={(e) => setBudget(e.target.value)}
										required
										style={{ padding: '10px', width: '100%', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
									/>
								</div>
								<div>
									<label><strong>Procurement Period</strong></label>
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
										<input
											type="date"
											placeholder="Start Date"
											value={startDate}
											onChange={(e) => setStartDate(e.target.value)}
											required
											style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
										/>
										<input
											type="date"
											placeholder="End Date"
											value={endDate}
											onChange={(e) => setEndDate(e.target.value)}
											required
											style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
										/>
									</div>
								</div>
							</div>

							<div style={{ marginBottom: '20px' }}>
								<label><strong>Description (Optional)</strong></label>
								<textarea
									placeholder="Add details about this procurement..."
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									style={{ padding: '10px', width: '100%', minHeight: '100px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
								/>
							</div>

							<button type="submit" style={{ padding: '12px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
								🚀 Launch Procurement
							</button>
						</form>
					</section>

					<section style={{ marginTop: '40px', padding: '20px', background: '#e7f3ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
						<h4>📋 Next Steps After Creation:</h4>
						<ol style={{ marginTop: '10px' }}>
							<li>Upload or select a procurement plan</li>
							<li>Configure RFQ/TOR templates</li>
							<li>Set workflow approval steps</li>
							<li>Assign roles to team members</li>
							<li>Publish RFQ to suppliers</li>
						</ol>
					</section>
		</div>
	);
}

