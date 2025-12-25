import React, { useState, useEffect } from 'react';

const TemplateManagerDebug = () => {
	const [templates, setTemplates] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [typeFilter, setTypeFilter] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const [previewTemplate, setPreviewTemplate] = useState(null);

	// Template types configuration
	const templateTypes = [
		{ value: 'rfq', label: 'Request for Quotation (RFQ)', icon: '📋', color: '#007bff' },
		{ value: 'tor', label: 'Terms of Reference (TOR)', icon: '📝', color: '#28a745' },
		{ value: 'evaluation', label: 'Evaluation Criteria', icon: '⭐', color: '#ffc107' },
		{ value: 'contract', label: 'Contract Terms', icon: '📄', color: '#6f42c1' },
		{ value: 'bid', label: 'Bid Document', icon: '💼', color: '#dc3545' },
		{ value: 'award', label: 'Award Letter', icon: '🏆', color: '#17a2b8' }
	];

	const generateMockTemplates = () => {
		return [
			{
				id: 1,
				name: 'Standard RFQ Template 2025',
				type: 'rfq',
				description: 'Comprehensive template for Request for Quotations with built-in evaluation criteria and compliance requirements',
				version: '2.1',
				status: 'active',
				isLocked: false,
				createdAt: '2025-01-10T10:00:00Z',
				updatedAt: '2025-01-15T14:30:00Z',
				createdBy: 'John Doe',
				usageCount: 15,
				fields: ['procurement_id', 'supplier_name', 'budget_amount', 'deadline', 'technical_requirements'],
				tags: ['standard', 'goods', 'services']
			},
			{
				id: 2,
				name: 'IT Services TOR Template',
				type: 'tor',
				description: 'Terms of Reference template specifically designed for IT service procurements with technical specifications',
				version: '1.5',
				status: 'active',
				isLocked: true,
				createdAt: '2025-01-05T09:15:00Z',
				updatedAt: '2025-01-12T11:20:00Z',
				createdBy: 'Jane Smith',
				usageCount: 8,
				fields: ['procurement_id', 'contact_person', 'evaluation_criteria', 'technical_specs'],
				tags: ['it', 'services', 'technical']
			},
			{
				id: 3,
				name: 'Technical Evaluation Matrix',
				type: 'evaluation',
				description: 'Comprehensive evaluation criteria matrix for technical proposals with weighted scoring',
				version: '3.0',
				status: 'draft',
				isLocked: false,
				createdAt: '2025-01-08T16:45:00Z',
				updatedAt: '2025-01-14T09:10:00Z',
				createdBy: 'Mike Johnson',
				usageCount: 3,
				fields: ['evaluation_criteria', 'budget_amount', 'technical_score', 'commercial_score'],
				tags: ['evaluation', 'technical', 'scoring']
			},
			{
				id: 4,
				name: 'Construction Works RFQ',
				type: 'rfq',
				description: 'Specialized template for construction and infrastructure projects with safety and environmental requirements',
				version: '1.8',
				status: 'active',
				isLocked: false,
				createdAt: '2024-12-20T13:20:00Z',
				updatedAt: '2025-01-20T16:45:00Z',
				createdBy: 'Sarah Wilson',
				usageCount: 22,
				fields: ['procurement_id', 'project_location', 'budget_amount', 'safety_requirements', 'environmental_compliance'],
				tags: ['construction', 'infrastructure', 'works']
			},
			{
				id: 5,
				name: 'Consultancy Services TOR',
				type: 'tor',
				description: 'Template for individual and firm consultancy services with deliverables and milestones',
				version: '2.3',
				status: 'active',
				isLocked: false,
				createdAt: '2025-01-01T08:30:00Z',
				updatedAt: '2025-01-18T12:15:00Z',
				createdBy: 'David Brown',
				usageCount: 12,
				fields: ['consultant_type', 'deliverables', 'milestones', 'payment_schedule'],
				tags: ['consultancy', 'individual', 'firm']
			},
			{
				id: 6,
				name: 'Contract Award Template',
				type: 'award',
				description: 'Standard award letter template with terms and conditions for successful bidders',
				version: '1.2',
				status: 'active',
				isLocked: true,
				createdAt: '2024-11-15T14:00:00Z',
				updatedAt: '2025-01-10T09:30:00Z',
				createdBy: 'Lisa Anderson',
				usageCount: 18,
				fields: ['winning_bidder', 'contract_value', 'award_conditions', 'next_steps'],
				tags: ['award', 'contract', 'winner']
			}
		];
	};

	useEffect(() => {
		const loadTemplates = async () => {
			try {
				setLoading(true);
				// Simulate API delay
				await new Promise(resolve => setTimeout(resolve, 500));
				const mockData = generateMockTemplates();
				setTemplates(mockData);
				setSuccess('Templates loaded successfully');
			} catch (error) {
				console.error('Error in loadTemplates:', error);
				setError('Failed to load templates');
			} finally {
				setLoading(false);
			}
		};

		loadTemplates();
	}, []);

	// Filter templates based on search and filters
	const filteredTemplates = templates.filter(template => {
		const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
							  template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
							  template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
		const matchesType = typeFilter === '' || template.type === typeFilter;
		const matchesStatus = statusFilter === '' || template.status === statusFilter;
		return matchesSearch && matchesType && matchesStatus;
	});

	// Get template type config
	const getTemplateTypeConfig = (type) => {
		return templateTypes.find(t => t.value === type) || { icon: '📄', color: '#6c757d' };
	};

	// Clear messages
	const clearMessages = () => {
		setError(null);
		setSuccess(null);
	};

	// Handle template preview
	const handlePreview = (template) => {
		setPreviewTemplate(template);
		setShowPreview(true);
	};

	// Handle template actions
	const handleDuplicate = (template) => {
		const newTemplate = {
			...template,
			id: Math.max(...templates.map(t => t.id)) + 1,
			name: `${template.name} (Copy)`,
			version: '1.0',
			status: 'draft',
			usageCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			createdBy: 'Current User'
		};
		setTemplates([newTemplate, ...templates]);
		setSuccess(`Template "${template.name}" duplicated successfully`);
	};

	const handleDelete = (templateId) => {
		if (window.confirm('Are you sure you want to delete this template?')) {
			setTemplates(templates.filter(t => t.id !== templateId));
			setSuccess('Template deleted successfully');
		}
	};

	const handleToggleStatus = (templateId) => {
		setTemplates(templates.map(t => 
			t.id === templateId 
				? { ...t, status: t.status === 'active' ? 'draft' : 'active', updatedAt: new Date().toISOString() }
				: t
		));
		setSuccess('Template status updated');
	};

	if (loading) {
		return (
			<div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
				<div style={{ 
					padding: '40px', 
					textAlign: 'center',
					background: '#f8f9fa',
					borderRadius: '12px',
					border: '2px dashed #dee2e6'
				}}>
					<div style={{ 
						display: 'inline-block', 
						fontSize: '2rem',
						animation: 'spin 1s linear infinite',
						marginBottom: '15px'
					}}>⏳</div>
					<div style={{ fontSize: '18px', color: '#6c757d' }}>Loading templates...</div>
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
			{/* Header */}
			<div style={{ marginBottom: '30px' }}>
				<h1 style={{ 
					display: 'flex', 
					alignItems: 'center', 
					gap: '15px', 
					color: '#2c3e50', 
					marginBottom: '10px',
					fontSize: '2.2rem',
					fontWeight: '700'
				}}>
					📄 Template Manager
				</h1>
				<p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '0' }}>
					Manage RFQ, TOR and evaluation templates. Create, edit, lock versions and map fields to procurement metadata.
				</p>
			</div>

			{/* Status Messages */}
			{error && (
				<div style={{ 
					padding: '15px 20px', 
					background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)', 
					border: '1px solid #f5c6cb', 
					borderRadius: '8px', 
					marginBottom: '25px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					boxShadow: '0 2px 4px rgba(220, 53, 69, 0.1)'
				}}>
					<span style={{ color: '#721c24', display: 'flex', alignItems: 'center', gap: '8px' }}>
						⚠️ {error}
					</span>
					<button 
						onClick={clearMessages}
						style={{ 
							background: 'none', 
							border: 'none', 
							color: '#721c24', 
							cursor: 'pointer',
							fontSize: '18px',
							padding: '4px',
							borderRadius: '4px'
						}}
					>
						×
					</button>
				</div>
			)}

			{success && (
				<div style={{ 
					padding: '15px 20px', 
					background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)', 
					border: '1px solid #c3e6cb', 
					borderRadius: '8px', 
					marginBottom: '25px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					boxShadow: '0 2px 4px rgba(40, 167, 69, 0.1)'
				}}>
					<span style={{ color: '#155724', display: 'flex', alignItems: 'center', gap: '8px' }}>
						✅ {success}
					</span>
					<button 
						onClick={clearMessages}
						style={{ 
							background: 'none', 
							border: 'none', 
							color: '#155724', 
							cursor: 'pointer',
							fontSize: '18px',
							padding: '4px',
							borderRadius: '4px'
						}}
					>
						×
					</button>
				</div>
			)}

			{/* Controls Bar */}
			<div style={{ 
				background: '#ffffff',
				border: '1px solid #e9ecef',
				borderRadius: '12px',
				padding: '25px',
				marginBottom: '30px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
			}}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', flex: 1 }}>
						{/* Search */}
						<div style={{ minWidth: '250px' }}>
							<input
								type="text"
								placeholder="🔍 Search templates..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								style={{
									width: '100%',
									padding: '12px 15px',
									border: '2px solid #e9ecef',
									borderRadius: '8px',
									fontSize: '14px',
									outline: 'none',
									transition: 'all 0.2s',
									background: '#f8f9fa'
								}}
							/>
						</div>

						{/* Type Filter */}
						<select
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value)}
							style={{
								padding: '12px 15px',
								border: '2px solid #e9ecef',
								borderRadius: '8px',
								fontSize: '14px',
								background: '#f8f9fa',
								outline: 'none',
								minWidth: '150px'
							}}
						>
							<option value="">All Types</option>
							{templateTypes.map(type => (
								<option key={type.value} value={type.value}>
									{type.icon} {type.label}
								</option>
							))}
						</select>

						{/* Status Filter */}
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							style={{
								padding: '12px 15px',
								border: '2px solid #e9ecef',
								borderRadius: '8px',
								fontSize: '14px',
								background: '#f8f9fa',
								outline: 'none',
								minWidth: '120px'
							}}
						>
							<option value="">All Status</option>
							<option value="active">Active</option>
							<option value="draft">Draft</option>
							<option value="archived">Archived</option>
						</select>
					</div>

					<button
						onClick={() => setShowCreateModal(true)}
						style={{
							background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
							color: 'white',
							border: 'none',
							padding: '12px 24px',
							borderRadius: '8px',
							fontSize: '14px',
							fontWeight: '600',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
							transition: 'all 0.2s'
						}}
					>
						➕ Create Template
					</button>
				</div>

				{/* Stats */}
				<div style={{ 
					marginTop: '20px', 
					padding: '15px 0', 
					borderTop: '1px solid #e9ecef',
					display: 'flex',
					flexWrap: 'wrap',
					gap: '30px'
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: '#007bff', fontWeight: '600' }}>📊</span>
						<span style={{ fontSize: '14px', color: '#6c757d' }}>
							Total: <strong>{templates.length}</strong>
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: '#28a745', fontWeight: '600' }}>✅</span>
						<span style={{ fontSize: '14px', color: '#6c757d' }}>
							Active: <strong>{templates.filter(t => t.status === 'active').length}</strong>
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: '#ffc107', fontWeight: '600' }}>📝</span>
						<span style={{ fontSize: '14px', color: '#6c757d' }}>
							Draft: <strong>{templates.filter(t => t.status === 'draft').length}</strong>
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: '#dc3545', fontWeight: '600' }}>🔒</span>
						<span style={{ fontSize: '14px', color: '#6c757d' }}>
							Locked: <strong>{templates.filter(t => t.isLocked).length}</strong>
						</span>
					</div>
				</div>
			</div>

			{/* Templates Grid */}
			<div style={{ 
				display: 'grid', 
				gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
				gap: '25px',
				marginBottom: '30px'
			}}>
				{filteredTemplates.map(template => {
					const typeConfig = getTemplateTypeConfig(template.type);
					return (
						<div key={template.id} style={{
							background: 'white',
							border: '1px solid #e9ecef',
							borderRadius: '12px',
							overflow: 'hidden',
							boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
							transition: 'all 0.3s ease',
							position: 'relative'
						}}>
							{/* Template Header */}
							<div style={{ 
								background: `linear-gradient(135deg, ${typeConfig.color}15 0%, ${typeConfig.color}08 100%)`,
								padding: '20px',
								borderBottom: '1px solid #e9ecef'
							}}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
										<span style={{ fontSize: '1.5rem' }}>{typeConfig.icon}</span>
										<span style={{ 
											background: typeConfig.color, 
											color: 'white',
											padding: '4px 12px', 
											borderRadius: '20px',
											fontSize: '11px',
											fontWeight: '600',
											textTransform: 'uppercase',
											letterSpacing: '0.5px'
										}}>
											{template.type}
										</span>
									</div>
									<div style={{ display: 'flex', gap: '4px' }}>
										{template.isLocked && (
											<span style={{ color: '#dc3545', fontSize: '16px' }} title="Locked">🔒</span>
										)}
										<span style={{ 
											background: template.status === 'active' ? '#28a745' : template.status === 'draft' ? '#ffc107' : '#6c757d',
											color: 'white',
											padding: '2px 8px',
											borderRadius: '12px',
											fontSize: '10px',
											fontWeight: '600',
											textTransform: 'uppercase'
										}}>
											{template.status}
										</span>
									</div>
								</div>
								
								<h3 style={{ 
									margin: '0 0 8px 0', 
									color: '#2c3e50',
									fontSize: '1.1rem',
									fontWeight: '600',
									lineHeight: '1.3'
								}}>
									{template.name}
								</h3>
								
								<p style={{ 
									color: '#6c757d', 
									margin: '0', 
									fontSize: '13px',
									lineHeight: '1.4',
									display: '-webkit-box',
									WebkitLineClamp: 2,
									WebkitBoxOrient: 'vertical',
									overflow: 'hidden'
								}}>
									{template.description}
								</p>
							</div>

							{/* Template Details */}
							<div style={{ padding: '20px' }}>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
									<div>
										<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Version</div>
										<div style={{ fontWeight: '600', color: '#2c3e50' }}>v{template.version}</div>
									</div>
									<div>
										<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Usage</div>
										<div style={{ fontWeight: '600', color: '#2c3e50' }}>{template.usageCount} times</div>
									</div>
									<div>
										<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Created</div>
										<div style={{ fontSize: '12px', color: '#2c3e50' }}>
											{new Date(template.createdAt).toLocaleDateString()}
										</div>
									</div>
									<div>
										<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Author</div>
										<div style={{ fontSize: '12px', color: '#2c3e50' }}>{template.createdBy}</div>
									</div>
								</div>

								{/* Tags */}
								{template.tags && template.tags.length > 0 && (
									<div style={{ marginBottom: '20px' }}>
										<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Tags</div>
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
											{template.tags.map((tag, index) => (
												<span key={index} style={{
													background: '#e9ecef',
													color: '#495057',
													padding: '2px 8px',
													borderRadius: '12px',
													fontSize: '10px',
													fontWeight: '500'
												}}>
													{tag}
												</span>
											))}
										</div>
									</div>
								)}

								{/* Action Buttons */}
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
									<button
										onClick={() => handlePreview(template)}
										style={{
											background: '#f8f9fa',
											color: '#495057',
											border: '1px solid #dee2e6',
											padding: '8px 12px',
											borderRadius: '6px',
											fontSize: '12px',
											fontWeight: '500',
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											gap: '4px',
											flex: '1',
											justifyContent: 'center',
											minWidth: '70px'
										}}
									>
										👁️ Preview
									</button>
									
									<button
										onClick={() => handleDuplicate(template)}
										style={{
											background: '#e3f2fd',
											color: '#1976d2',
											border: '1px solid #bbdefb',
											padding: '8px 12px',
											borderRadius: '6px',
											fontSize: '12px',
											fontWeight: '500',
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											gap: '4px',
											flex: '1',
											justifyContent: 'center',
											minWidth: '70px'
										}}
									>
										📋 Copy
									</button>

									<button
										onClick={() => handleToggleStatus(template.id)}
										disabled={template.isLocked}
										style={{
											background: template.status === 'active' ? '#fff3cd' : '#d4edda',
											color: template.status === 'active' ? '#856404' : '#155724',
											border: template.status === 'active' ? '1px solid #ffeaa7' : '1px solid #c3e6cb',
											padding: '8px 12px',
											borderRadius: '6px',
											fontSize: '12px',
											fontWeight: '500',
											cursor: template.isLocked ? 'not-allowed' : 'pointer',
											opacity: template.isLocked ? 0.5 : 1,
											display: 'flex',
											alignItems: 'center',
											gap: '4px',
											flex: '1',
											justifyContent: 'center',
											minWidth: '70px'
										}}
									>
										{template.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
									</button>

									{!template.isLocked && (
										<button
											onClick={() => handleDelete(template.id)}
											style={{
												background: '#f8d7da',
												color: '#721c24',
												border: '1px solid #f5c6cb',
												padding: '8px 12px',
												borderRadius: '6px',
												fontSize: '12px',
												fontWeight: '500',
												cursor: 'pointer',
												display: 'flex',
												alignItems: 'center',
												gap: '4px',
												minWidth: '60px',
												justifyContent: 'center'
											}}
										>
											🗑️ Delete
										</button>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Empty State */}
			{filteredTemplates.length === 0 && !loading && (
				<div style={{ 
					textAlign: 'center', 
					padding: '60px 20px',
					background: '#f8f9fa',
					borderRadius: '12px',
					border: '2px dashed #dee2e6'
				}}>
					<div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
					<h3 style={{ color: '#6c757d', marginBottom: '10px' }}>
						{searchTerm || typeFilter || statusFilter ? 'No templates match your filters' : 'No templates yet'}
					</h3>
					<p style={{ color: '#6c757d', marginBottom: '20px' }}>
						{searchTerm || typeFilter || statusFilter 
							? 'Try adjusting your search or filter criteria' 
							: 'Create your first template to get started with procurement document management'
						}
					</p>
					{!(searchTerm || typeFilter || statusFilter) && (
						<button
							onClick={() => setShowCreateModal(true)}
							style={{
								background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
								color: 'white',
								border: 'none',
								padding: '12px 24px',
								borderRadius: '8px',
								fontSize: '14px',
								fontWeight: '600',
								cursor: 'pointer',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '8px',
								boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)'
							}}
						>
							➕ Create First Template
						</button>
					)}
				</div>
			)}

			{/* Template Preview Modal */}
			{showPreview && previewTemplate && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0,0,0,0.5)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 1000,
					padding: '20px'
				}}>
					<div style={{
						background: 'white',
						borderRadius: '12px',
						maxWidth: '600px',
						width: '100%',
						maxHeight: '80vh',
						overflow: 'auto'
					}}>
						<div style={{ padding: '25px', borderBottom: '1px solid #e9ecef' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<h2 style={{ margin: 0, color: '#2c3e50' }}>Template Preview</h2>
								<button
									onClick={() => setShowPreview(false)}
									style={{
										background: 'none',
										border: 'none',
										fontSize: '24px',
										cursor: 'pointer',
										color: '#6c757d'
									}}
								>
									×
								</button>
							</div>
						</div>
						<div style={{ padding: '25px' }}>
							<h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>{previewTemplate.name}</h3>
							<p style={{ color: '#6c757d', marginBottom: '20px' }}>{previewTemplate.description}</p>
							
							<div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
								<h4 style={{ color: '#495057', marginBottom: '15px' }}>Template Fields</h4>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
									{previewTemplate.fields.map((field, index) => (
										<span key={index} style={{
											background: 'white',
											color: '#495057',
											padding: '6px 12px',
											borderRadius: '16px',
											fontSize: '12px',
											border: '1px solid #dee2e6',
											fontWeight: '500'
										}}>
											{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
										</span>
									))}
								</div>
							</div>

							<div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#495057' }}>
								<strong>Template Content Preview:</strong><br/>
								This is where the actual template content would be displayed.<br/>
								The template includes sections for: {previewTemplate.fields.join(', ')}<br/><br/>
								<em>Version: {previewTemplate.version} | Created by: {previewTemplate.createdBy}</em>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Create Template Modal Placeholder */}
			{showCreateModal && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0,0,0,0.5)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 1000,
					padding: '20px'
				}}>
					<div style={{
						background: 'white',
						borderRadius: '12px',
						padding: '30px',
						maxWidth: '500px',
						width: '100%',
						textAlign: 'center'
					}}>
						<h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Create New Template</h3>
						<p style={{ color: '#6c757d', marginBottom: '20px' }}>
							Template creation functionality would be implemented here with form fields for name, description, type, and content.
						</p>
						<button
							onClick={() => setShowCreateModal(false)}
							style={{
								background: '#6c757d',
								color: 'white',
								border: 'none',
								padding: '10px 20px',
								borderRadius: '6px',
								cursor: 'pointer'
							}}
						>
							Close
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default TemplateManagerDebug;