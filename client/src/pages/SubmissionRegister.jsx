import React, { useState, useEffect } from 'react';

export default function SubmissionRegister() {
	const [submissions, setSubmissions] = useState([]);
	const [supplierName, setSupplierName] = useState('');
	const [submissionDate, setSubmissionDate] = useState('');
	const [rfqId, setRfqId] = useState('');
	const [isLocked, setIsLocked] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [filterRfq, setFilterRfq] = useState('');
	const [availableRfqs, setAvailableRfqs] = useState([]);

	// Load submissions and RFQs on component mount
	useEffect(() => {
		loadSubmissions();
		loadAvailableRfqs();
		checkLockStatus();
	}, []);

	const loadSubmissions = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/submissions');
			if (response.ok) {
				const data = await response.json();
				setSubmissions(data);
			} else {
				// Fallback to mock data if API fails
				setSubmissions(mockSubmissions);
			}
		} catch (error) {
			console.error('Error loading submissions:', error);
			setSubmissions(mockSubmissions);
			setError('Failed to load submissions from server. Showing sample data.');
		} finally {
			setLoading(false);
		}
	};

	const loadAvailableRfqs = async () => {
		try {
			const response = await fetch('/api/rfqs');
			if (response.ok) {
				const data = await response.json();
				setAvailableRfqs(data);
			}
		} catch (error) {
			console.error('Error loading RFQs:', error);
			// Set some default RFQs for demo purposes
			setAvailableRfqs([
				{ id: 'RFQ-2025-001', title: 'Office Supplies' },
				{ id: 'RFQ-2025-002', title: 'IT Equipment' }
			]);
		}
	};

	const checkLockStatus = async () => {
		try {
			const response = await fetch('/api/submissions/status');
			if (response.ok) {
				const data = await response.json();
				setIsLocked(data.isLocked);
			}
		} catch (error) {
			console.error('Error checking lock status:', error);
		}
	};

	const validateForm = () => {
		if (!supplierName.trim()) {
			setError('Supplier name is required');
			return false;
		}
		if (!submissionDate) {
			setError('Submission date/time is required');
			return false;
		}
		if (!rfqId) {
			setError('RFQ ID is required');
			return false;
		}
		
		// Check if submission time is not in the future
		const submissionTime = new Date(submissionDate);
		const now = new Date();
		if (submissionTime > now) {
			setError('Submission time cannot be in the future');
			return false;
		}
		
		return true;
	};

	const handleAddSubmission = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		
		if (!validateForm()) return;

		try {
			setLoading(true);
			const response = await fetch('/api/submissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					supplier: supplierName.trim(), 
					submittedAt: submissionDate, 
					rfqId: rfqId 
				})
			});
			
			if (response.ok) {
				setSupplierName('');
				setSubmissionDate('');
				setRfqId('');
				setSuccess('Submission recorded successfully!');
				await loadSubmissions();
			} else {
				const errorData = await response.json();
				setError(errorData.message || 'Failed to record submission');
			}
		} catch (error) {
			console.error('Error adding submission:', error);
			setError('Failed to record submission. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleLockSubmissions = async () => {
		if (!window.confirm('Are you sure you want to lock submissions? This action cannot be undone.')) {
			return;
		}

		try {
			setLoading(true);
			const response = await fetch('/api/submissions/lock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			
			if (response.ok) {
				setIsLocked(true);
				setSuccess('Submissions have been locked successfully!');
			} else {
				const errorData = await response.json();
				setError(errorData.message || 'Failed to lock submissions');
			}
		} catch (error) {
			console.error('Error locking submissions:', error);
			setError('Failed to lock submissions. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteSubmission = async (submissionId) => {
		if (!window.confirm('Are you sure you want to delete this submission?')) {
			return;
		}

		try {
			setLoading(true);
			const response = await fetch(`/api/submissions/${submissionId}`, {
				method: 'DELETE'
			});
			
			if (response.ok) {
				setSuccess('Submission deleted successfully!');
				await loadSubmissions();
			} else {
				const errorData = await response.json();
				setError(errorData.message || 'Failed to delete submission');
			}
		} catch (error) {
			console.error('Error deleting submission:', error);
			setError('Failed to delete submission. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const clearMessages = () => {
		setError('');
		setSuccess('');
	};

	// Filter submissions based on search and RFQ filter
	const filteredSubmissions = submissions.filter(submission => {
		const matchesSearch = submission.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 submission.rfq.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesRfq = filterRfq === '' || submission.rfq === filterRfq;
		return matchesSearch && matchesRfq;
	});

	const mockSubmissions = [
		{ id: 1, supplier: 'ABC Suppliers', timestamp: '2025-01-10 09:15:22', rfq: 'RFQ-2025-001', status: 'Received' },
		{ id: 2, supplier: 'Tech Solutions', timestamp: '2025-01-10 10:45:00', rfq: 'RFQ-2025-001', status: 'Received' },
		{ id: 3, supplier: 'Global Traders', timestamp: '2025-01-10 14:20:15', rfq: 'RFQ-2025-001', status: 'Received' },
		{ id: 4, supplier: 'Premium Services', timestamp: '2025-01-10 15:55:30', rfq: 'RFQ-2025-002', status: 'Received' }
	];

	return (
		<div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
			<div style={{ marginBottom: '30px' }}>
				<h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}>
					📋 Submission Register
				</h1>
				<p style={{ color: '#6c757d', fontSize: '16px' }}>
					Record and timestamp submissions, track participants, and lock submissions at close.
				</p>
			</div>

			{/* Status Messages */}
			{error && (
				<div style={{ 
					padding: '15px', 
					background: '#f8d7da', 
					border: '1px solid #dc3545', 
					borderRadius: '8px', 
					marginBottom: '20px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}>
					<span style={{ color: '#721c24' }}>⚠️ {error}</span>
					<button 
						onClick={clearMessages}
						style={{ 
							background: 'none', 
							border: 'none', 
							color: '#721c24', 
							cursor: 'pointer',
							fontSize: '18px'
						}}
					>
						×
					</button>
				</div>
			)}

			{success && (
				<div style={{ 
					padding: '15px', 
					background: '#d4edda', 
					border: '1px solid #28a745', 
					borderRadius: '8px', 
					marginBottom: '20px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}>
					<span style={{ color: '#155724' }}>✅ {success}</span>
					<button 
						onClick={clearMessages}
						style={{ 
							background: 'none', 
							border: 'none', 
							color: '#155724', 
							cursor: 'pointer',
							fontSize: '18px'
						}}
					>
						×
					</button>
				</div>
			)}

			{/* Lock Status */}
			{isLocked && (
				<div style={{ 
					padding: '20px', 
					background: '#fff3cd', 
					border: '1px solid #ffc107', 
					borderRadius: '8px', 
					marginBottom: '30px',
					textAlign: 'center'
				}}>
					<div style={{ fontSize: '24px', marginBottom: '10px' }}>🔒</div>
					<strong style={{ color: '#856404', fontSize: '18px' }}>
						Submissions are LOCKED
					</strong>
					<p style={{ color: '#856404', margin: '10px 0 0 0' }}>
						No further submissions can be accepted for this procurement.
					</p>
				</div>
			)}

			{/* Loading Indicator */}
			{loading && (
				<div style={{ 
					padding: '20px', 
					textAlign: 'center', 
					background: '#f8f9fa', 
					borderRadius: '8px', 
					marginBottom: '20px' 
				}}>
					<div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</div>
					<span style={{ marginLeft: '10px' }}>Processing...</span>
				</div>
			)}

			{/* Submission Form */}
			<section style={{ 
				marginBottom: '40px', 
				padding: '25px', 
				border: '1px solid #dee2e6', 
				borderRadius: '12px',
				background: '#ffffff',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
			}}>
				<h3 style={{ marginTop: '0', color: '#495057', marginBottom: '20px' }}>
					📝 Record New Submission
				</h3>
				{isLocked ? (
					<div style={{ 
						padding: '20px', 
						background: '#f8d7da', 
						border: '1px solid #dc3545', 
						borderRadius: '8px',
						textAlign: 'center'
					}}>
						<span style={{ color: '#721c24', fontSize: '16px' }}>
							🚫 Submissions are locked. Cannot accept new submissions.
						</span>
					</div>
				) : (
					<form onSubmit={handleAddSubmission}>
						<div style={{ 
							display: 'grid', 
							gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
							gap: '20px', 
							marginBottom: '20px' 
						}}>
							<div>
								<label style={{ 
									display: 'block', 
									marginBottom: '8px', 
									fontWeight: '500',
									color: '#495057'
								}}>
									Supplier Name: *
								</label>
								<input
									type="text"
									placeholder="Enter company name"
									value={supplierName}
									onChange={(e) => setSupplierName(e.target.value)}
									required
									style={{ 
										padding: '12px', 
										width: '100%', 
										border: '1px solid #ced4da',
										borderRadius: '6px',
										fontSize: '14px',
										boxSizing: 'border-box'
									}}
								/>
							</div>
							<div>
								<label style={{ 
									display: 'block', 
									marginBottom: '8px', 
									fontWeight: '500',
									color: '#495057'
								}}>
									Submission Date & Time: *
								</label>
								<input
									type="datetime-local"
									value={submissionDate}
									onChange={(e) => setSubmissionDate(e.target.value)}
									required
									max={new Date().toISOString().slice(0, 16)}
									style={{ 
										padding: '12px', 
										width: '100%', 
										border: '1px solid #ced4da',
										borderRadius: '6px',
										fontSize: '14px',
										boxSizing: 'border-box'
									}}
								/>
							</div>
							<div>
								<label style={{ 
									display: 'block', 
									marginBottom: '8px', 
									fontWeight: '500',
									color: '#495057'
								}}>
									RFQ ID: *
								</label>
								<select
									value={rfqId}
									onChange={(e) => setRfqId(e.target.value)}
									required
									style={{ 
										padding: '12px', 
										width: '100%', 
										border: '1px solid #ced4da',
										borderRadius: '6px',
										fontSize: '14px',
										boxSizing: 'border-box'
									}}
								>
									<option value="">Select RFQ</option>
									{availableRfqs.map(rfq => (
										<option key={rfq.id} value={rfq.id}>
											{rfq.id} - {rfq.title}
										</option>
									))}
								</select>
							</div>
						</div>
						<div style={{ display: 'flex', gap: '10px' }}>
							<button 
								type="submit" 
								disabled={loading}
								style={{ 
									padding: '12px 24px', 
									background: loading ? '#6c757d' : '#28a745', 
									color: 'white', 
									border: 'none', 
									borderRadius: '6px', 
									cursor: loading ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								{loading ? '⏳ Recording...' : '📝 Record Submission'}
							</button>
							<button 
								type="button"
								onClick={() => {
									setSupplierName('');
									setSubmissionDate('');
									setRfqId('');
									clearMessages();
								}}
								style={{ 
									padding: '12px 24px', 
									background: '#6c757d', 
									color: 'white', 
									border: 'none', 
									borderRadius: '6px', 
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								🗑️ Clear Form
							</button>
						</div>
					</form>
				)}
			</section>

			{/* Submissions List */}
			<section>
				<div style={{ 
					display: 'flex', 
					justifyContent: 'space-between', 
					alignItems: 'flex-start',
					marginBottom: '25px',
					flexWrap: 'wrap',
					gap: '20px'
				}}>
					<div>
						<h3 style={{ margin: '0 0 5px 0', color: '#495057' }}>
							📊 Submissions Log ({filteredSubmissions.length} of {submissions.length})
						</h3>
						<p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
							Chronological record of all received submissions
						</p>
					</div>
					{!isLocked && (
						<button 
							onClick={handleLockSubmissions} 
							disabled={loading}
							style={{ 
								padding: '12px 20px', 
								background: loading ? '#6c757d' : '#dc3545', 
								color: 'white', 
								border: 'none', 
								borderRadius: '8px', 
								cursor: loading ? 'not-allowed' : 'pointer',
								fontSize: '14px',
								fontWeight: '500',
								display: 'flex',
								alignItems: 'center',
								gap: '8px'
							}}
						>
							🔒 {loading ? 'Locking...' : 'Lock Submissions'}
						</button>
					)}
				</div>

				{/* Search and Filter Controls */}
				<div style={{ 
					display: 'flex', 
					gap: '15px', 
					marginBottom: '25px',
					flexWrap: 'wrap'
				}}>
					<div style={{ flex: '1', minWidth: '250px' }}>
						<input
							type="text"
							placeholder="🔍 Search suppliers or RFQ IDs..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							style={{
								padding: '10px 15px',
								width: '100%',
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px',
								boxSizing: 'border-box'
							}}
						/>
					</div>
					<div style={{ minWidth: '200px' }}>
						<select
							value={filterRfq}
							onChange={(e) => setFilterRfq(e.target.value)}
							style={{
								padding: '10px 15px',
								width: '100%',
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px',
								boxSizing: 'border-box'
							}}
						>
							<option value="">All RFQs</option>
							{[...new Set(submissions.map(s => s.rfq))].map(rfqId => (
								<option key={rfqId} value={rfqId}>{rfqId}</option>
							))}
						</select>
					</div>
					{(searchTerm || filterRfq) && (
						<button
							onClick={() => {
								setSearchTerm('');
								setFilterRfq('');
							}}
							style={{
								padding: '10px 15px',
								background: '#6c757d',
								color: 'white',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer',
								fontSize: '14px'
							}}
						>
							Clear Filters
						</button>
					)}
				</div>

				{/* Submissions Table */}
				<div style={{ 
					background: '#ffffff',
					borderRadius: '12px',
					overflow: 'hidden',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #dee2e6'
				}}>
					{filteredSubmissions.length === 0 ? (
						<div style={{ 
							padding: '40px', 
							textAlign: 'center', 
							color: '#6c757d' 
						}}>
							{submissions.length === 0 ? (
								<>
									<div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
									<h4 style={{ margin: '0 0 10px 0' }}>No Submissions Yet</h4>
									<p style={{ margin: '0' }}>
										Submissions will appear here once suppliers start responding to RFQs.
									</p>
								</>
							) : (
								<>
									<div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
									<h4 style={{ margin: '0 0 10px 0' }}>No Matching Submissions</h4>
									<p style={{ margin: '0' }}>
										Try adjusting your search or filter criteria.
									</p>
								</>
							)}
						</div>
					) : (
						<div style={{ overflowX: 'auto' }}>
							<table style={{ 
								width: '100%', 
								borderCollapse: 'collapse',
								minWidth: '700px'
							}}>
								<thead>
									<tr style={{ background: '#f8f9fa' }}>
										<th style={{ 
											padding: '15px', 
											textAlign: 'left', 
											borderBottom: '2px solid #dee2e6',
											fontWeight: '600',
											color: '#495057'
										}}>
											Supplier
										</th>
										<th style={{ 
											padding: '15px', 
											textAlign: 'left', 
											borderBottom: '2px solid #dee2e6',
											fontWeight: '600',
											color: '#495057'
										}}>
											Submission Time
										</th>
										<th style={{ 
											padding: '15px', 
											textAlign: 'left', 
											borderBottom: '2px solid #dee2e6',
											fontWeight: '600',
											color: '#495057'
										}}>
											RFQ ID
										</th>
										<th style={{ 
											padding: '15px', 
											textAlign: 'left', 
											borderBottom: '2px solid #dee2e6',
											fontWeight: '600',
											color: '#495057'
										}}>
											Status
										</th>
										{!isLocked && (
											<th style={{ 
												padding: '15px', 
												textAlign: 'center', 
												borderBottom: '2px solid #dee2e6',
												fontWeight: '600',
												color: '#495057',
												width: '120px'
											}}>
												Actions
											</th>
										)}
									</tr>
								</thead>
								<tbody>
									{filteredSubmissions.map((submission, index) => (
										<tr 
											key={submission.id} 
											style={{ 
												borderBottom: '1px solid #dee2e6',
												backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
											}}
										>
											<td style={{ padding: '15px' }}>
												<div style={{ fontWeight: '500', color: '#495057' }}>
													{submission.supplier}
												</div>
											</td>
											<td style={{ padding: '15px' }}>
												<div style={{ color: '#495057' }}>
													{new Date(submission.timestamp).toLocaleString()}
												</div>
											</td>
											<td style={{ padding: '15px' }}>
												<div style={{ 
													background: '#e9ecef', 
													padding: '4px 8px', 
													borderRadius: '4px',
													display: 'inline-block',
													fontSize: '12px',
													fontWeight: '500',
													color: '#495057'
												}}>
													{submission.rfq}
												</div>
											</td>
											<td style={{ padding: '15px' }}>
												<span style={{ 
													background: '#d4edda', 
													padding: '6px 12px', 
													borderRadius: '20px',
													fontSize: '12px',
													fontWeight: '500',
													color: '#155724',
													display: 'inline-flex',
													alignItems: 'center',
													gap: '5px'
												}}>
													✓ {submission.status}
												</span>
											</td>
											{!isLocked && (
												<td style={{ padding: '15px', textAlign: 'center' }}>
													<button
														onClick={() => handleDeleteSubmission(submission.id)}
														disabled={loading}
														style={{
															background: '#dc3545',
															color: 'white',
															border: 'none',
															borderRadius: '4px',
															padding: '6px 12px',
															cursor: loading ? 'not-allowed' : 'pointer',
															fontSize: '12px',
															opacity: loading ? 0.6 : 1
														}}
														title="Delete submission"
													>
														🗑️
													</button>
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</section>

			{/* Summary Statistics */}
			{submissions.length > 0 && (
				<section style={{ 
					marginTop: '30px',
					padding: '20px',
					background: '#f8f9fa',
					borderRadius: '8px',
					border: '1px solid #dee2e6'
				}}>
					<h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>📈 Summary</h4>
					<div style={{ 
						display: 'grid', 
						gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
						gap: '15px' 
					}}>
						<div style={{ textAlign: 'center' }}>
							<div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
								{submissions.length}
							</div>
							<div style={{ color: '#6c757d', fontSize: '14px' }}>Total Submissions</div>
						</div>
						<div style={{ textAlign: 'center' }}>
							<div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
								{[...new Set(submissions.map(s => s.supplier))].length}
							</div>
							<div style={{ color: '#6c757d', fontSize: '14px' }}>Unique Suppliers</div>
						</div>
						<div style={{ textAlign: 'center' }}>
							<div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
								{[...new Set(submissions.map(s => s.rfq))].length}
							</div>
							<div style={{ color: '#6c757d', fontSize: '14px' }}>Active RFQs</div>
						</div>
						<div style={{ textAlign: 'center' }}>
							<div style={{ fontSize: '24px', fontWeight: 'bold', color: isLocked ? '#dc3545' : '#28a745' }}>
								{isLocked ? '🔒' : '🔓'}
							</div>
							<div style={{ color: '#6c757d', fontSize: '14px' }}>
								{isLocked ? 'Locked' : 'Open'}
							</div>
						</div>
					</div>
				</section>
			)}

			{/* Add custom CSS for animations */}
			<style>{`
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
				
				table tbody tr:hover {
					background-color: #e9ecef !important;
				}
				
				button:hover:not(:disabled) {
					transform: translateY(-1px);
					box-shadow: 0 4px 8px rgba(0,0,0,0.15);
				}
				
				input:focus, select:focus {
					outline: none;
					border-color: #007bff;
					box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
				}
			`}</style>
		</div>
	);
}

