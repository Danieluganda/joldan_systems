import React, { useState, useCallback } from 'react';
import { useProcurement } from '../hooks/useProcurement';
import StandardLayout from '../components/layout/StandardLayout';
import './pages.css';

export default function PlanningPage() {
	const { 
		procurements, 
		loading, 
		error, 
		createProcurement, 
		updateProcurement, 
		deleteProcurement,
		fetchProcurements
	} = useProcurement();
	
	const [newPlanName, setNewPlanName] = useState('');
	const [planDescription, setPlanDescription] = useState('');
	const [planBudget, setPlanBudget] = useState('');
	const [uploadFile, setUploadFile] = useState(null);
	const [editingPlan, setEditingPlan] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState({ type: '', text: '' });
	const [uploadProgress, setUploadProgress] = useState(0);

	// Clear message after 5 seconds
	const showMessage = useCallback((type, text) => {
		setMessage({ type, text });
		setTimeout(() => setMessage({ type: '', text: '' }), 5000);
	}, []);

	const handleCreatePlan = async (e) => {
		e.preventDefault();
		if (!newPlanName.trim()) {
			showMessage('error', 'Plan name is required');
			return;
		}

		setSubmitting(true);
		try {
			const planData = {
				name: newPlanName.trim(),
				description: planDescription.trim(),
				budget: planBudget ? parseFloat(planBudget) : null,
				status: 'planning',
				currentStage: 'planning',
				type: 'plan'
			};

			await createProcurement(planData);
			setNewPlanName('');
			setPlanDescription('');
			setPlanBudget('');
			showMessage('success', 'Plan created successfully!');
		} catch (error) {
			showMessage('error', 'Error creating plan: ' + error.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleUploadPlan = async (e) => {
		e.preventDefault();
		if (!uploadFile) {
			showMessage('error', 'Please select a file to upload');
			return;
		}

		// Validate file type
		const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
		if (!allowedTypes.includes(uploadFile.type)) {
			showMessage('error', 'Please upload a valid file format (Excel, PDF, or Word)');
			return;
		}

		// Validate file size (10MB limit)
		if (uploadFile.size > 10 * 1024 * 1024) {
			showMessage('error', 'File size must be less than 10MB');
			return;
		}

		setSubmitting(true);
		const formData = new FormData();
		formData.append('file', uploadFile);
		formData.append('type', 'plan');

		try {
			const response = await fetch('/api/plans/upload', {
				method: 'POST',
				body: formData
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Upload failed');
			}

			setUploadFile(null);
			setUploadProgress(0);
			await fetchProcurements(); // Refresh the list
			showMessage('success', 'Plan uploaded successfully!');
			
			// Reset file input
			document.getElementById('file-upload').value = '';
		} catch (error) {
			showMessage('error', 'Error uploading plan: ' + error.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleEditPlan = (plan) => {
		setEditingPlan({
			id: plan.id,
			name: plan.name,
			description: plan.description || '',
			budget: plan.budget || ''
		});
	};

	const handleUpdatePlan = async (e) => {
		e.preventDefault();
		if (!editingPlan.name.trim()) {
			showMessage('error', 'Plan name is required');
			return;
		}

		setSubmitting(true);
		try {
			const updateData = {
				name: editingPlan.name.trim(),
				description: editingPlan.description.trim(),
				budget: editingPlan.budget ? parseFloat(editingPlan.budget) : null
			};

			await updateProcurement(editingPlan.id, updateData);
			setEditingPlan(null);
			showMessage('success', 'Plan updated successfully!');
		} catch (error) {
			showMessage('error', 'Error updating plan: ' + error.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeletePlan = async (planId, planName) => {
		if (!window.confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
			return;
		}

		setSubmitting(true);
		try {
			await deleteProcurement(planId);
			showMessage('success', 'Plan deleted successfully!');
		} catch (error) {
			showMessage('error', 'Error deleting plan: ' + error.message);
		} finally {
			setSubmitting(false);
		}
	};

	const getStatusStyle = (status) => {
		switch (status?.toLowerCase()) {
			case 'active': return { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
			case 'completed': return { background: '#cce7ff', color: '#004085', border: '1px solid #b3d7ff' };
			case 'planning': return { background: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' };
			case 'on-hold': return { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
			default: return { background: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' };
		}
	};

	const headerActions = [
		{
			label: '📄 Import Template',
			variant: 'secondary',
			onClick: () => {
				// Download procurement planning template
				const link = document.createElement('a');
				link.href = '/templates/procurement-plan-template.xlsx';
				link.download = 'procurement-plan-template.xlsx';
				link.click();
			}
		},
		{
			label: '📊 Analytics',
			variant: 'info',
			onClick: () => {
				// Navigate to planning analytics
				showMessage('info', 'Planning analytics coming soon!');
			}
		}
	];

	return (
		<StandardLayout
			title="📋 Procurement Planning"
			description="Upload or create procurement plans, assign milestones, and map to procurement activities"
			headerActions={headerActions}
		>
			{/* Message Display */}
			{message.text && (
				<div className={`alert alert-${message.type === 'success' ? 'info' : message.type === 'error' ? 'urgent' : 'warning'}`} style={{ marginBottom: '24px' }}>
					<span className="alert-icon">
						{message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
					</span>
					<span className="alert-message">{message.text}</span>
				</div>
			)}

			<div className="dashboard-grid">
				{/* Left Column - Forms */}
				<div className="forms-section">
					{/* Create New Plan Form */}
					<div className="card">
						<div className="card-header">
							<h3>📝 Create New Plan</h3>
						</div>
						<div className="card-body">
							<form onSubmit={handleCreatePlan} className="form-group">
								<div className="input-group">
									<label htmlFor="plan-name">Plan Name *</label>
									<input
										id="plan-name"
										type="text"
										placeholder="e.g., Q1 2025 Procurement Plan"
										value={newPlanName}
										onChange={(e) => setNewPlanName(e.target.value)}
										disabled={submitting}
										className="form-input"
									/>
								</div>

								<div className="input-group">
									<label htmlFor="plan-description">Description</label>
									<textarea
										id="plan-description"
										placeholder="Brief description of the procurement plan objectives..."
										value={planDescription}
										onChange={(e) => setPlanDescription(e.target.value)}
										disabled={submitting}
										className="form-textarea"
										rows="3"
									/>
								</div>

								<div className="input-group">
									<label htmlFor="plan-budget">Estimated Budget (USD)</label>
									<input
										id="plan-budget"
										type="number"
										placeholder="0.00"
										value={planBudget}
										onChange={(e) => setPlanBudget(e.target.value)}
										disabled={submitting}
										className="form-input"
										min="0"
										step="0.01"
									/>
								</div>

								<button 
									type="submit" 
									disabled={submitting || !newPlanName.trim()}
									className={`btn btn-primary ${submitting ? 'loading' : ''}`}
								>
									{submitting ? '⏳ Creating...' : '📋 Create Plan'}
								</button>
							</form>
						</div>
					</div>

					{/* Upload Plan Form */}
					<div className="card">
						<div className="card-header">
							<h3>📤 Upload Existing Plan</h3>
						</div>
						<div className="card-body">
							<form onSubmit={handleUploadPlan} className="form-group">
								<div className="input-group">
									<label htmlFor="file-upload">Select File</label>
									<input
										id="file-upload"
										type="file"
										accept=".xlsx,.xls,.pdf,.doc,.docx"
										onChange={(e) => setUploadFile(e.target.files[0])}
										disabled={submitting}
										className="form-input"
									/>
									<small className="input-help">Supported formats: Excel, PDF, Word (max 10MB)</small>
								</div>

								{uploadFile && (
									<div className="file-preview">
										<span className="file-info">
											📄 {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
										</span>
									</div>
								)}

								<button 
									type="submit" 
									disabled={submitting || !uploadFile}
									className={`btn btn-secondary ${submitting ? 'loading' : ''}`}
								>
									{submitting ? '⏳ Uploading...' : '📤 Upload Plan'}
								</button>
							</form>
						</div>
					</div>
				</div>

				{/* Right Column - Plans List */}
				<div className="plans-section">
					<div className="card">
						<div className="card-header">
							<h3>📊 Active Plans ({procurements.length})</h3>
						</div>
						<div className="card-body">
							{error && (
								<div className="alert alert-urgent">
									<span className="alert-icon">❌</span>
									<span className="alert-message">{error}</span>
								</div>
							)}

							{loading ? (
								<div className="loading-state">
									<div className="spinner"></div>
									<p>Loading plans...</p>
								</div>
							) : procurements.length === 0 ? (
								<div className="empty-state">
									<div className="empty-icon">📋</div>
									<h4>No plans yet</h4>
									<p>Create your first procurement plan or upload an existing one to get started.</p>
								</div>
							) : (
								<div className="table-responsive">
									<table className="data-table">
										<thead>
											<tr>
												<th>Plan Name</th>
												<th>Status</th>
												<th>Budget</th>
												<th>Created</th>
												<th>Actions</th>
											</tr>
										</thead>
										<tbody>
											{procurements.map((plan) => (
												<tr key={plan.id}>
													<td>
														<div className="plan-info">
															<strong>{plan.name}</strong>
															{plan.description && (
																<small className="plan-description">{plan.description}</small>
															)}
														</div>
													</td>
													<td>
														<span 
															className="status-badge" 
															style={getStatusStyle(plan.status || 'Draft')}
														>
															{plan.status || 'Draft'}
														</span>
													</td>
													<td>
														{plan.budget ? `$${plan.budget.toLocaleString()}` : 'Not set'}
													</td>
													<td>{new Date(plan.createdAt).toLocaleDateString()}</td>
													<td>
														<div className="action-buttons">
															<button 
																className="btn btn-sm btn-secondary"
																onClick={() => handleEditPlan(plan)}
																disabled={submitting}
																title="Edit plan"
															>
																✏️
															</button>
															<button 
																className="btn btn-sm btn-danger"
																onClick={() => handleDeletePlan(plan.id, plan.name)}
																disabled={submitting}
																title="Delete plan"
															>
																🗑️
															</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Edit Plan Modal */}
			{editingPlan && (
				<div className="modal-overlay" onClick={() => !submitting && setEditingPlan(null)}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>✏️ Edit Plan</h3>
							<button 
								className="modal-close"
								onClick={() => !submitting && setEditingPlan(null)}
								disabled={submitting}
							>
								×
							</button>
						</div>
						<div className="modal-body">
							<form onSubmit={handleUpdatePlan} className="form-group">
								<div className="input-group">
									<label htmlFor="edit-plan-name">Plan Name *</label>
									<input
										id="edit-plan-name"
										type="text"
										value={editingPlan.name}
										onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
										disabled={submitting}
										className="form-input"
									/>
								</div>

								<div className="input-group">
									<label htmlFor="edit-plan-description">Description</label>
									<textarea
										id="edit-plan-description"
										value={editingPlan.description}
										onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
										disabled={submitting}
										className="form-textarea"
										rows="3"
									/>
								</div>

								<div className="input-group">
									<label htmlFor="edit-plan-budget">Estimated Budget (USD)</label>
									<input
										id="edit-plan-budget"
										type="number"
										value={editingPlan.budget}
										onChange={(e) => setEditingPlan({...editingPlan, budget: e.target.value})}
										disabled={submitting}
										className="form-input"
										min="0"
										step="0.01"
									/>
								</div>

								<div className="modal-actions">
									<button 
										type="button"
										className="btn btn-secondary"
										onClick={() => setEditingPlan(null)}
										disabled={submitting}
									>
										Cancel
									</button>
									<button 
										type="submit"
										className={`btn btn-primary ${submitting ? 'loading' : ''}`}
										disabled={submitting || !editingPlan.name.trim()}
									>
										{submitting ? '⏳ Saving...' : '💾 Save Changes'}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}
		</StandardLayout>
	);
}

