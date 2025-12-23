import React, { useState } from 'react';

export default function AwardPage() {
	const [selectedBidder, setSelectedBidder] = useState(null);
	const [awardNotes, setAwardNotes] = useState('');
	const [awardedSupplier, setAwardedSupplier] = useState(null);

	const mockBids = [
		{ id: 1, supplier: 'ABC Suppliers', amount: 50000, score: 92, status: 'Evaluated' },
		{ id: 2, supplier: 'Tech Solutions', amount: 48000, score: 95, status: 'Evaluated' },
		{ id: 3, supplier: 'Global Traders', amount: 52000, score: 88, status: 'Evaluated' }
	];

	const handleAwardContract = async (supplierId) => {
		if (!awardNotes.trim()) {
			alert('Please provide award notes');
			return;
		}

		try {
			const response = await fetch('/api/awards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ supplierId, notes: awardNotes })
			});
			if (response.ok) {
				setAwardedSupplier(supplierId);
				setAwardNotes('');
			}
		} catch (error) {
			console.error('Error awarding contract:', error);
		}
	};

	return (
		<div style={{ padding: '30px' }}>
					<h1>🏆 Award Decision</h1>
					<p>Record award decisions, link to contracts, and notify stakeholders.</p>

					{awardedSupplier && (
						<div style={{ padding: '15px', background: '#d4edda', border: '1px solid #28a745', borderRadius: '4px', marginTop: '20px', marginBottom: '20px' }}>
							✓ <strong>Award Granted</strong> to {mockBids.find(b => b.id === awardedSupplier)?.supplier}
						</div>
					)}

					<section style={{ marginTop: '30px' }}>
						<h3>Evaluated Bids</h3>
						<div style={{ marginTop: '20px' }}>
							{mockBids.map((bid) => (
								<div
									key={bid.id}
									style={{
										padding: '20px',
										border: awardedSupplier === bid.id ? '2px solid #28a745' : '1px solid #ddd',
										borderRadius: '8px',
										marginBottom: '15px',
										background: awardedSupplier === bid.id ? '#f0fff4' : '#fafafa'
									}}
								>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
										<div style={{ flex: 1 }}>
											<h4 style={{ margin: '0 0 10px 0' }}>
												{awardedSupplier === bid.id && '🏆 '}
												{bid.supplier}
											</h4>
											<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
												<div>
													<p style={{ margin: '0', color: '#666', fontSize: '12px' }}>BID AMOUNT</p>
													<p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px' }}>${bid.amount.toLocaleString()}</p>
												</div>
												<div>
													<p style={{ margin: '0', color: '#666', fontSize: '12px' }}>EVALUATION SCORE</p>
													<p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px' }}>{bid.score}/100</p>
												</div>
											</div>
										</div>
										{!awardedSupplier && (
											<button
												onClick={() => setSelectedBidder(bid.id)}
												style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
											>
												Award
											</button>
										)}
									</div>

									{selectedBidder === bid.id && !awardedSupplier && (
										<div style={{ marginTop: '15px', padding: '15px', background: '#e7f3ff', borderRadius: '4px' }}>
											<h4>Award Confirmation</h4>
											<textarea
												placeholder="Enter award justification notes..."
												value={awardNotes}
												onChange={(e) => setAwardNotes(e.target.value)}
												style={{ padding: '8px', width: '100%', minHeight: '80px', marginTop: '10px', fontFamily: 'inherit' }}
											/>
											<button
												onClick={() => handleAwardContract(bid.id)}
												style={{ marginTop: '10px', padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
											>
												Confirm Award
											</button>
										</div>
									)}
								</div>
							))}
						</div>
					</section>
		</div>
	);
}

