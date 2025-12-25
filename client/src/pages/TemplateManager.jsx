import React, { useState, useEffect } from 'react';

export default function TemplateManager() {
	// Template state
	const [templates, setTemplates] = useState([]);
	const [selectedTemplate, setSelectedTemplate] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	// Form state
	const [showModal, setShowModal] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState(null);
	const [templateForm, setTemplateForm] = useState({
		name: '',
		type: 'rfq',
		description: '',
		version: '1.0',
		content: '',
		fields: [],
		isActive: true
	});
	const [formErrors, setFormErrors] = useState({});

	// Filter and search state
	const [searchTerm, setSearchTerm] = useState('');
	const [typeFilter, setTypeFilter] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [showPreview, setShowPreview] = useState(false);
	const [previewTemplate, setPreviewTemplate] = useState(null);

	// Field mapping state
	const [showFieldMapper, setShowFieldMapper] = useState(false);
	const [mappingTemplate, setMappingTemplate] = useState(null);
	const [templateFields, setTemplateFields] = useState([]);
	const [availableMetadata, setAvailableMetadata] = useState([]);

	// Template types configuration
	const templateTypes = [
		{ value: 'rfq', label: 'Request for Quotation (RFQ)', icon: '📋', color: '#007bff' },
		{ value: 'tor', label: 'Terms of Reference (TOR)', icon: '📝', color: '#28a745' },
		{ value: 'evaluation', label: 'Evaluation Criteria', icon: '⭐', color: '#ffc107' },
		{ value: 'contract', label: 'Contract Terms', icon: '📄', color: '#6f42c1' },
		{ value: 'bid', label: 'Bid Document', icon: '💼', color: '#dc3545' },
		{ value: 'award', label: 'Award Letter', icon: '🏆', color: '#17a2b8' }
	];

	// Load templates on component mount
	useEffect(() => {
		loadTemplates();
		loadAvailableMetadata();
	}, []);

	const loadTemplates = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/templates');
			if (response.ok) {
				const data = await response.json();
				setTemplates(data);
			} else {
				// Fallback to mock data
				setTemplates(generateMockTemplates());
			}
		} catch (error) {
			console.error('Error loading templates:', error);
			setTemplates(generateMockTemplates());
			setError('Failed to load templates from server. Showing sample data.');
		} finally {
			setLoading(false);
		}
	};

	const loadAvailableMetadata = async () => {
		try {
			const response = await fetch('/api/templates/metadata');
			if (response.ok) {
				const data = await response.json();
				setAvailableMetadata(data);
			} else {
				// Fallback metadata fields
				setAvailableMetadata([
					{ id: 'procurement_id', label: 'Procurement ID', type: 'text' },
					{ id: 'supplier_name', label: 'Supplier Name', type: 'text' },
					{ id: 'budget_amount', label: 'Budget Amount', type: 'currency' },
					{ id: 'deadline', label: 'Submission Deadline', type: 'date' },
					{ id: 'evaluation_criteria', label: 'Evaluation Criteria', type: 'text' },
					{ id: 'contact_person', label: 'Contact Person', type: 'text' }
				]);
			}
		} catch (error) {
			console.error('Error loading metadata:', error);
		}
	};

	const generateMockTemplates = () => [
		{
			id: 1,
			name: 'Standard RFQ Template 2025',
			type: 'rfq',
			description: 'Standard template for Request for Quotations with comprehensive evaluation criteria',
			version: '2.1',
			status: 'active',
			isLocked: false,
			createdAt: '2025-01-10T10:00:00Z',
			updatedAt: '2025-01-15T14:30:00Z',
			createdBy: 'John Doe',
			fields: ['procurement_id', 'supplier_name', 'budget_amount', 'deadline'],
			content: 'Standard RFQ template content with placeholders...',
			usageCount: 15
		},
		{
			id: 2,
			name: 'IT Services TOR Template',
			type: 'tor',
			description: 'Terms of Reference template specifically designed for IT service procurements',
			version: '1.5',
			status: 'active',
			isLocked: true,
			createdAt: '2025-01-05T09:15:00Z',
			updatedAt: '2025-01-12T11:20:00Z',
			createdBy: 'Jane Smith',
			fields: ['procurement_id', 'contact_person', 'evaluation_criteria'],
			content: 'IT Services TOR template content...',
			usageCount: 8
		},
		{
			id: 3,
			name: 'Technical Evaluation Criteria',
			type: 'evaluation',
			description: 'Comprehensive evaluation criteria for technical proposals',
			version: '3.0',
			status: 'draft',
			isLocked: false,
			createdAt: '2025-01-08T16:45:00Z',
			updatedAt: '2025-01-14T09:10:00Z',
			createdBy: 'Mike Johnson',
			fields: ['evaluation_criteria', 'budget_amount'],
			content: 'Technical evaluation criteria template...',
			usageCount: 3
		}
	];

	// Form validation
	const validateTemplateForm = () => {
		const errors = {};
		
		if (!templateForm.name.trim()) {
			errors.name = 'Template name is required';
		} else if (templateForm.name.length < 3) {
			errors.name = 'Template name must be at least 3 characters';
		}
		
		if (!templateForm.description.trim()) {
			errors.description = 'Description is required';
		} else if (templateForm.description.length < 10) {
			errors.description = 'Description must be at least 10 characters';
		}
		
		if (!templateForm.content.trim()) {
			errors.content = 'Template content is required';
		}
		
		if (!templateForm.version.trim()) {
			errors.version = 'Version is required';
		}
		
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleCreateTemplate = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		
		if (!validateTemplateForm()) return;

		try {
			setLoading(true);
			const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
			const method = editingTemplate ? 'PUT' : 'POST';
			
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(templateForm)
			});
			
			if (response.ok) {
				setSuccess(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
				setShowModal(false);
				resetForm();
				await loadTemplates();
			} else {
				const errorData = await response.json();
				setError(errorData.message || 'Failed to save template');
			}
		} catch (error) {
			console.error('Error saving template:', error);
			setError('Failed to save template. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteTemplate = async (templateId) => {
		if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
			return;
		}

		try {
			setLoading(true);
			const response = await fetch(`/api/templates/${templateId}`, {
				method: 'DELETE'
			});
			
			if (response.ok) {
				setSuccess('Template deleted successfully!');
				await loadTemplates();
			} else {
				const errorData = await response.json();
				setError(errorData.message || 'Failed to delete template');
			}
		} catch (error) {
			console.error('Error deleting template:', error);
			setError('Failed to delete template. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleLockTemplate = async (templateId, shouldLock = true) => {
		const action = shouldLock ? 'lock' : 'unlock';
		
		if (shouldLock && !window.confirm('Are you sure you want to lock this template version? Locked templates cannot be edited.')) {
			return;
		}

		try {
			setLoading(true);
			const response = await fetch(`/api/templates/${templateId}/lock`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ locked: shouldLock })
			});
			
			if (response.ok) {
				setSuccess(`Template ${action}ed successfully!`);
				await loadTemplates();
			} else {
				const errorData = await response.json();
				setError(errorData.message || `Failed to ${action} template`);
			}
		} catch (error) {
			console.error(`Error ${action}ing template:`, error);
			setError(`Failed to ${action} template. Please try again.`);
		} finally {
			setLoading(false);
		}
	};

	const handleDuplicateTemplate = async (template) => {
		try {
			setLoading(true);
			const duplicatedTemplate = {
				...templateForm,
				name: `${template.name} - Copy`,
				description: template.description,
				type: template.type,
				content: template.content,
				fields: template.fields,
				version: '1.0'
			};

			const response = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(duplicatedTemplate)
			});
			
			if (response.ok) {
				setSuccess('Template duplicated successfully!');
				await loadTemplates();
			} else {
				const errorData = await response.json();
				setError(errorData.message || 'Failed to duplicate template');
			}
		} catch (error) {
			console.error('Error duplicating template:', error);
			setError('Failed to duplicate template. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleExportTemplate = async (template, format = 'json') => {
		try {
			const response = await fetch(`/api/templates/${template.id}/export?format=${format}`);
			
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${template.name.replace(/\s+/g, '_')}.${format}`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
				
				setSuccess(`Template exported successfully as ${format.toUpperCase()}`);
			} else {
				setError('Failed to export template');
			}
		} catch (error) {
			console.error('Error exporting template:', error);
			setError('Failed to export template. Please try again.');
		}
	};

	// Utility functions
	const resetForm = () => {
		setTemplateForm({
			name: '',
			type: 'rfq',
			description: '',
			version: '1.0',
			content: '',
			fields: [],
			isActive: true
		});
		setFormErrors({});
		setEditingTemplate(null);
	};

	const openCreateModal = () => {
		resetForm();
		setShowModal(true);
	};

	const openEditModal = (template) => {
		setTemplateForm({
			name: template.name,
			type: template.type,
			description: template.description,
			version: template.version,
			content: template.content || '',
			fields: template.fields || [],
			isActive: template.status === 'active'
		});
		setEditingTemplate(template);
		setShowModal(true);
	};

	const openPreviewModal = (template) => {
		setPreviewTemplate(template);
		setShowPreview(true);
	};

	const openFieldMapper = (template) => {
		setMappingTemplate(template);
		setTemplateFields(template.fields || []);
		setShowFieldMapper(true);
	};

	const clearMessages = () => {
		setError('');
		setSuccess('');
	};

	const getTypeInfo = (type) => {
		return templateTypes.find(t => t.value === type) || templateTypes[0];
	};

	const getStatusColor = (status) => {
		const colors = {
			active: '#28a745',
			draft: '#ffc107',
			archived: '#6c757d'
		};
		return colors[status] || '#6c757d';
	};

	// Filter templates based on search and filters
	const filteredTemplates = templates.filter(template => {
		const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 template.description.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesType = typeFilter === '' || template.type === typeFilter;
		const matchesStatus = statusFilter === '' || template.status === statusFilter;
		return matchesSearch && matchesType && matchesStatus;
	});

	return (
		<div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
			<div style={{ marginBottom: '30px' }}>
				<h1 style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#2c3e50', marginBottom: '10px' }}>
					📄 Template Manager
				</h1>
				<p style={{ color: '#6c757d', fontSize: '16px' }}>
					Manage RFQ, TOR and evaluation templates. Create, edit, lock versions and map fields to procurement metadata.
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

			{/* Header Actions */}
			<div style={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'center',
				marginBottom: '30px',
				flexWrap: 'wrap',
				gap: '15px'
			}}>
				<div style={{ display: 'flex', gap: '10px' }}>
					<button
						onClick={openCreateModal}
						style={{
							padding: '12px 20px',
							background: '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							display: 'flex',
							alignItems: 'center',
							gap: '8px'
						}}
					>
						➕ New Template
					</button>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
					<span style={{ color: '#495057', fontWeight: '500' }}>
						{filteredTemplates.length} of {templates.length} templates
					</span>
				</div>
			</div>

			{/* Search and Filter Controls */}
			<div style={{ 
				marginBottom: '30px',
				padding: '20px',
				background: '#f8f9fa',
				borderRadius: '8px',
				border: '1px solid #dee2e6'
			}}>
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
					gap: '15px'
				}}>
					<div>
						<label style={{ 
							display: 'block', 
							marginBottom: '5px', 
							fontWeight: '500',
							color: '#495057'
						}}>
							Search Templates
						</label>
						<input
							type="text"
							placeholder="🔍 Search by name or description..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							style={{ 
								padding: '10px', 
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
							marginBottom: '5px', 
							fontWeight: '500',
							color: '#495057'
						}}>
							Template Type
						</label>
						<select
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value)}
							style={{ 
								padding: '10px', 
								width: '100%', 
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px',
								boxSizing: 'border-box'
							}}
						>
							<option value="">All Types</option>
							{templateTypes.map(type => (
								<option key={type.value} value={type.value}>
									{type.label}
								</option>
							))}
						</select>
					</div>
					
					<div>
						<label style={{ 
							display: 'block', 
							marginBottom: '5px', 
							fontWeight: '500',
							color: '#495057'
						}}>
							Status
						</label>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							style={{ 
								padding: '10px', 
								width: '100%', 
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px',
								boxSizing: 'border-box'
							}}
						>
							<option value="">All Statuses</option>
							<option value="active">Active</option>
							<option value="draft">Draft</option>
							<option value="archived">Archived</option>
						</select>
					</div>
				</div>
				
				{(searchTerm || typeFilter || statusFilter) && (
					<div style={{ marginTop: '15px' }}>
						<button
							onClick={() => {
								setSearchTerm('');
								setTypeFilter('');
								setStatusFilter('');
							}}
							style={{ 
								padding: '8px 16px', 
								background: '#6c757d', 
								color: 'white', 
								border: 'none', 
								borderRadius: '6px', 
								cursor: 'pointer',
								fontSize: '14px'
							}}
						>
							🗑️ Clear Filters
						</button>
					</div>
				)}
			</div>

			{/* Templates Grid */}
			{filteredTemplates.length === 0 ? (
				<div style={{ 
					padding: '60px', 
					textAlign: 'center',
					background: '#ffffff',
					borderRadius: '12px',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ fontSize: '64px', marginBottom: '20px' }}>📄</div>
					{templates.length === 0 ? (
						<>
							<h3 style={{ marginBottom: '10px', color: '#495057' }}>No Templates Yet</h3>
							<p style={{ marginBottom: '20px', color: '#6c757d' }}>
								Create your first template to get started with standardized procurement documents.
							</p>
							<button
								onClick={openCreateModal}
								style={{
									padding: '12px 24px',
									background: '#007bff',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								➕ Create First Template
							</button>
						</>
					) : (
						<>
							<h3 style={{ marginBottom: '10px', color: '#495057' }}>No Matching Templates</h3>
							<p style={{ marginBottom: '0', color: '#6c757d' }}>
								No templates match your current filters. Try adjusting your search criteria.
							</p>
						</>
					)}
				</div>
			) : (
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
					gap: '20px'
				}}>
					{filteredTemplates.map((template) => {
						const typeInfo = getTypeInfo(template.type);
						return (
							<div 
								key={template.id}
								style={{
									padding: '25px',
									background: '#ffffff',
									border: '1px solid #dee2e6',
									borderRadius: '12px',
									boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
									transition: 'all 0.2s ease'
								}}
								className="template-card"
							>
								{/* Template Header */}
								<div style={{ marginBottom: '15px' }}>
									<div style={{ 
										display: 'flex', 
										justifyContent: 'space-between', 
										alignItems: 'flex-start',
										marginBottom: '10px'
									}}>
										<div style={{ flex: 1 }}>
											<div style={{ 
												display: 'flex', 
												alignItems: 'center', 
												gap: '10px',
												marginBottom: '8px'
											}}>
												<span 
													style={{ 
														fontSize: '20px',
														color: typeInfo.color 
													}}
												>
													{typeInfo.icon}
												</span>
												<h4 style={{ 
													margin: 0, 
													color: '#2c3e50',
													fontSize: '16px',
													fontWeight: '600'
												}}>
													{template.name}
												</h4>
											</div>
											<div style={{ 
												display: 'flex', 
												alignItems: 'center', 
												gap: '10px',
												marginBottom: '5px'
											}}>
												<span style={{
													background: typeInfo.color + '20',
													color: typeInfo.color,
													padding: '3px 8px',
													borderRadius: '12px',
													fontSize: '11px',
													fontWeight: '500'
												}}>
													{typeInfo.label}
												</span>
												<span style={{
													background: getStatusColor(template.status) + '20',
													color: getStatusColor(template.status),
													padding: '3px 8px',
													borderRadius: '12px',
													fontSize: '11px',
													fontWeight: '500',
													textTransform: 'capitalize'
												}}>
													{template.status}
												</span>
												{template.isLocked && (
													<span style={{
														background: '#ffc107',
														color: '#856404',
														padding: '3px 8px',
														borderRadius: '12px',
														fontSize: '11px',
														fontWeight: '500'
													}}>
														🔒 Locked
													</span>
												)}
											</div>
										</div>
									</div>

									<p style={{ 
										color: '#6c757d', 
										fontSize: '14px', 
										margin: '0 0 10px 0',
										lineHeight: '1.4'
									}}>
										{template.description}
									</p>
								</div>

								{/* Template Info */}
								<div style={{ 
									padding: '15px 0',
									borderTop: '1px solid #f0f0f0',
									borderBottom: '1px solid #f0f0f0',
									marginBottom: '15px'
								}}>
									<div style={{ 
										display: 'grid',
										gridTemplateColumns: '1fr 1fr',
										gap: '15px',
										fontSize: '12px',
										color: '#6c757d'
									}}>
										<div>
											<strong style={{ color: '#495057' }}>Version:</strong>
											<div>{template.version}</div>
										</div>
										<div>
											<strong style={{ color: '#495057' }}>Usage:</strong>
											<div>{template.usageCount || 0} times</div>
										</div>
										<div>
											<strong style={{ color: '#495057' }}>Created:</strong>
											<div>{new Date(template.createdAt).toLocaleDateString()}</div>
										</div>
										<div>
											<strong style={{ color: '#495057' }}>Modified:</strong>
											<div>{new Date(template.updatedAt).toLocaleDateString()}</div>
										</div>
									</div>
									
									{template.fields && template.fields.length > 0 && (
										<div style={{ marginTop: '10px' }}>
											<strong style={{ color: '#495057', fontSize: '12px' }}>
												Mapped Fields ({template.fields.length}):
											</strong>
											<div style={{ 
												display: 'flex', 
												flexWrap: 'wrap', 
												gap: '5px',
												marginTop: '5px'
											}}>
												{template.fields.slice(0, 3).map(field => (
													<span 
														key={field}
														style={{
															background: '#e9ecef',
															color: '#495057',
															padding: '2px 6px',
															borderRadius: '8px',
															fontSize: '10px'
														}}
													>
														{field}
													</span>
												))}
												{template.fields.length > 3 && (
													<span style={{ color: '#6c757d', fontSize: '10px' }}>
														+{template.fields.length - 3} more
													</span>
												)}
											</div>
										</div>
									)}
								</div>

								{/* Action Buttons */}
								<div style={{ 
									display: 'flex', 
									flexWrap: 'wrap',
									gap: '8px',
									alignItems: 'center'
								}}>
									<button
										onClick={() => openPreviewModal(template)}
										style={{
											padding: '6px 12px',
											background: '#17a2b8',
											color: 'white',
											border: 'none',
											borderRadius: '4px',
											cursor: 'pointer',
											fontSize: '12px',
											fontWeight: '500'
										}}
										title="Preview template"
									>
										👁️ Preview
									</button>

									<button
										onClick={() => openEditModal(template)}
										disabled={template.isLocked}
										style={{
											padding: '6px 12px',
											background: template.isLocked ? '#6c757d' : '#28a745',
											color: 'white',
											border: 'none',
											borderRadius: '4px',
											cursor: template.isLocked ? 'not-allowed' : 'pointer',
											fontSize: '12px',
											fontWeight: '500',
											opacity: template.isLocked ? 0.6 : 1
										}}
										title={template.isLocked ? 'Template is locked' : 'Edit template'}
									>
										✏️ Edit
									</button>

									<button
										onClick={() => openFieldMapper(template)}
										style={{
											padding: '6px 12px',
											background: '#6f42c1',
											color: 'white',
											border: 'none',
											borderRadius: '4px',
											cursor: 'pointer',
											fontSize: '12px',
											fontWeight: '500'
										}}
										title="Map template fields"
									>
										🗺️ Fields
									</button>

									<div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
										<button
											onClick={() => handleLockTemplate(template.id, !template.isLocked)}
											style={{
												padding: '6px 8px',
												background: template.isLocked ? '#dc3545' : '#ffc107',
												color: template.isLocked ? 'white' : '#000',
												border: 'none',
												borderRadius: '4px',
												cursor: 'pointer',
												fontSize: '12px'
											}}
											title={template.isLocked ? 'Unlock template' : 'Lock template'}
										>
											{template.isLocked ? '🔓' : '🔒'}
										</button>

										<button
											onClick={() => handleDuplicateTemplate(template)}
											style={{
												padding: '6px 8px',
												background: '#6c757d',
												color: 'white',
												border: 'none',
												borderRadius: '4px',
												cursor: 'pointer',
												fontSize: '12px'
											}}
											title="Duplicate template"
										>
											📋
										</button>

										<div className="dropdown-container" style={{ position: 'relative' }}>
											<button
												style={{
													padding: '6px 8px',
													background: '#495057',
													color: 'white',
													border: 'none',
													borderRadius: '4px',
													cursor: 'pointer',
													fontSize: '12px'
												}}
												title="More actions"
												onClick={(e) => {
													e.stopPropagation();
													// Toggle dropdown menu
													const dropdown = e.target.nextSibling;
													dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
												}}
											>
												⋮
											</button>
											<div 
												style={{
													display: 'none',
													position: 'absolute',
													right: 0,
													top: '100%',
													background: 'white',
													border: '1px solid #dee2e6',
													borderRadius: '6px',
													boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
													zIndex: 1000,
													minWidth: '150px'
												}}
											>
												<button
													onClick={() => handleExportTemplate(template, 'json')}
													style={{
														display: 'block',
														width: '100%',
														padding: '8px 12px',
														background: 'none',
														border: 'none',
														textAlign: 'left',
														cursor: 'pointer',
														fontSize: '12px',
														color: '#495057'
													}}
												>
													📤 Export JSON
												</button>
												<button
													onClick={() => handleExportTemplate(template, 'docx')}
													style={{
														display: 'block',
														width: '100%',
														padding: '8px 12px',
														background: 'none',
														border: 'none',
														textAlign: 'left',
														cursor: 'pointer',
														fontSize: '12px',
														color: '#495057'
													}}
												>
													📄 Export DOCX
												</button>
												<hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #eee' }} />
												<button
													onClick={() => handleDeleteTemplate(template.id)}
													style={{
														display: 'block',
														width: '100%',
														padding: '8px 12px',
														background: 'none',
														border: 'none',
														textAlign: 'left',
														cursor: 'pointer',
														fontSize: '12px',
														color: '#dc3545'
													}}
												>
													🗑️ Delete
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

		{/* Create/Edit Template Modal */}
		{(isCreateModalOpen || isEditModalOpen) && (
			<div style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000
			}}>
				<div style={{
					background: 'white',
					borderRadius: '12px',
					width: '90%',
					maxWidth: '600px',
					maxHeight: '85vh',
					overflow: 'auto'
				}}>
					<div style={{
						padding: '20px 30px',
						borderBottom: '1px solid #eee',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						background: '#f8f9fa'
					}}>
						<h3 style={{ margin: 0 }}>
							{isEditModalOpen ? 'Edit Template' : 'Create New Template'}
						</h3>
						<button
							onClick={closeModals}
							style={{
								background: 'none',
								border: 'none',
								fontSize: '24px',
								cursor: 'pointer',
								color: '#666'
							}}
						>
							×
						</button>
					</div>

					<div style={{ padding: '30px' }}>
						{formErrors.submit && (
							<div style={{
								background: '#f8d7da',
								color: '#721c24',
								padding: '10px',
								borderRadius: '4px',
								marginBottom: '20px',
								border: '1px solid #f5c6cb'
							}}>
								{formErrors.submit}
							</div>
						)}

						<form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
									Template Name *
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									placeholder="Enter template name"
									style={{
										width: '100%',
										padding: '10px',
										border: formErrors.name ? '1px solid #dc3545' : '1px solid #ced4da',
										borderRadius: '4px',
										fontSize: '14px'
									}}
								/>
								{formErrors.name && (
									<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
										{formErrors.name}
									</div>
								)}
							</div>

							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
									Template Type *
								</label>
								<select
									value={formData.type}
									onChange={(e) => setFormData({ ...formData, type: e.target.value })}
									style={{
										width: '100%',
										padding: '10px',
										border: formErrors.type ? '1px solid #dc3545' : '1px solid #ced4da',
										borderRadius: '4px',
										fontSize: '14px'
									}}
								>
									<option value="">Select template type</option>
									<option value="rfq">Request for Quotation (RFQ)</option>
									<option value="tor">Terms of Reference (TOR)</option>
									<option value="evaluation">Evaluation Criteria</option>
									<option value="contract">Contract Template</option>
									<option value="award">Award Template</option>
								</select>
								{formErrors.type && (
									<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
										{formErrors.type}
									</div>
								)}
							</div>

							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
									Description
								</label>
								<textarea
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									placeholder="Brief description of the template"
									rows={3}
									style={{
										width: '100%',
										padding: '10px',
										border: '1px solid #ced4da',
										borderRadius: '4px',
										fontSize: '14px',
										resize: 'vertical'
									}}
								/>
							</div>

							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
									Category
								</label>
								<select
									value={formData.category}
									onChange={(e) => setFormData({ ...formData, category: e.target.value })}
									style={{
										width: '100%',
										padding: '10px',
										border: '1px solid #ced4da',
										borderRadius: '4px',
										fontSize: '14px'
									}}
								>
									<option value="standard">Standard</option>
									<option value="custom">Custom</option>
									<option value="department">Department Specific</option>
									<option value="project">Project Specific</option>
								</select>
							</div>

							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
									Template Content *
								</label>
								<textarea
									value={formData.content}
									onChange={(e) => setFormData({ ...formData, content: e.target.value })}
									placeholder="Enter the template content or upload a document"
									rows={8}
									style={{
										width: '100%',
										padding: '10px',
										border: formErrors.content ? '1px solid #dc3545' : '1px solid #ced4da',
										borderRadius: '4px',
										fontSize: '14px',
										fontFamily: 'monospace',
										resize: 'vertical'
									}}
								/>
								{formErrors.content && (
									<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
										{formErrors.content}
									</div>
								)}
								<div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
									Use {`{{fieldName}}`} for dynamic fields (e.g., {`{{companyName}}, {{projectTitle}}`})
								</div>
							</div>

							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
									Initial Status
								</label>
								<select
									value={formData.status}
									onChange={(e) => setFormData({ ...formData, status: e.target.value })}
									style={{
										width: '100%',
										padding: '10px',
										border: '1px solid #ced4da',
										borderRadius: '4px',
										fontSize: '14px'
									}}
								>
									<option value="draft">Draft</option>
									<option value="active">Active</option>
									<option value="archived">Archived</option>
								</select>
							</div>

							<div style={{ display: 'flex', gap: '10px', paddingTop: '10px' }}>
								<button
									type="button"
									onClick={closeModals}
									style={{
										flex: 1,
										padding: '12px',
										background: '#6c757d',
										color: 'white',
										border: 'none',
										borderRadius: '6px',
										cursor: 'pointer',
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isLoading}
									style={{
										flex: 1,
										padding: '12px',
										background: isLoading ? '#6c757d' : '#007bff',
										color: 'white',
										border: 'none',
										borderRadius: '6px',
										cursor: isLoading ? 'not-allowed' : 'pointer',
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									{isLoading ? 'Saving...' : (isEditModalOpen ? 'Update Template' : 'Create Template')}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		)}

		{/* Preview Modal */}
		{isPreviewModalOpen && selectedTemplate && (
			<div style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000
			}}>
				<div style={{
					background: 'white',
					borderRadius: '12px',
					width: '90%',
					maxWidth: '800px',
					maxHeight: '85vh',
					overflow: 'auto'
				}}>
					<div style={{
						padding: '20px 30px',
						borderBottom: '1px solid #eee',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						background: '#f8f9fa'
					}}>
						<div>
							<h3 style={{ margin: '0 0 5px 0' }}>Template Preview</h3>
							<div style={{ fontSize: '14px', color: '#6c757d' }}>
								{selectedTemplate.name} (v{selectedTemplate.version})
							</div>
						</div>
						<button
							onClick={closeModals}
							style={{
								background: 'none',
								border: 'none',
								fontSize: '24px',
								cursor: 'pointer',
								color: '#666'
							}}
						>
							×
						</button>
					</div>

					<div style={{ padding: '30px' }}>
						<div style={{
							background: '#f8f9fa',
							padding: '20px',
							borderRadius: '8px',
							marginBottom: '20px'
						}}>
							<h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Template Information</h4>
							<div style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
								gap: '15px',
								fontSize: '14px'
							}}>
								<div>
									<strong>Type:</strong> {getTypeInfo(selectedTemplate.type).label}
								</div>
								<div>
									<strong>Status:</strong> {selectedTemplate.status}
								</div>
								<div>
									<strong>Category:</strong> {selectedTemplate.category}
								</div>
								<div>
									<strong>Usage Count:</strong> {selectedTemplate.usageCount || 0}
								</div>
							</div>
							{selectedTemplate.description && (
								<div style={{ marginTop: '15px' }}>
									<strong>Description:</strong>
									<p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
										{selectedTemplate.description}
									</p>
								</div>
							)}
						</div>

						<div>
							<h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Template Content</h4>
							<div style={{
								background: '#ffffff',
								border: '1px solid #dee2e6',
								borderRadius: '8px',
								padding: '20px',
								whiteSpace: 'pre-wrap',
								fontFamily: 'Georgia, serif',
								fontSize: '14px',
								lineHeight: '1.6',
								maxHeight: '400px',
								overflow: 'auto'
							}}>
								{selectedTemplate.content || 'No content available for this template.'}
							</div>
						</div>

						{selectedTemplate.fields && selectedTemplate.fields.length > 0 && (
							<div style={{ marginTop: '20px' }}>
								<h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>
									Dynamic Fields ({selectedTemplate.fields.length})
								</h4>
								<div style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '8px'
								}}>
									{selectedTemplate.fields.map((field, index) => (
										<span
											key={index}
											style={{
												background: '#e7f3ff',
												color: '#0066cc',
												padding: '6px 12px',
												borderRadius: '20px',
												fontSize: '12px',
												fontWeight: '500'
											}}
										>
											{`{{${field}}}`}
										</span>
									))}
								</div>
							</div>
						)}

						<div style={{
							display: 'flex',
							gap: '10px',
							justifyContent: 'flex-end',
							marginTop: '30px',
							paddingTop: '20px',
							borderTop: '1px solid #eee'
						}}>
							<button
								onClick={closeModals}
								style={{
									padding: '10px 20px',
									background: '#6c757d',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px'
								}}
							>
								Close
							</button>
							<button
								onClick={() => {
									closeModals();
									openEditModal(selectedTemplate);
								}}
								style={{
									padding: '10px 20px',
									background: '#28a745',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px'
								}}
							>
								✏️ Edit Template
							</button>
						</div>
					</div>
				</div>
			</div>
		)}

		{/* Field Mapper Modal */}
		{isFieldMapperOpen && selectedTemplate && (
			<div style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000
			}}>
				<div style={{
					background: 'white',
					borderRadius: '12px',
					width: '90%',
					maxWidth: '700px',
					maxHeight: '85vh',
					overflow: 'auto'
				}}>
					<div style={{
						padding: '20px 30px',
						borderBottom: '1px solid #eee',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						background: '#f8f9fa'
					}}>
						<div>
							<h3 style={{ margin: '0 0 5px 0' }}>Field Mapping</h3>
							<div style={{ fontSize: '14px', color: '#6c757d' }}>
								{selectedTemplate.name}
							</div>
						</div>
						<button
							onClick={closeModals}
							style={{
								background: 'none',
								border: 'none',
								fontSize: '24px',
								cursor: 'pointer',
								color: '#666'
							}}
						>
							×
						</button>
					</div>

					<div style={{ padding: '30px' }}>
						<div style={{
							background: '#e3f2fd',
							border: '1px solid #bbdefb',
							borderRadius: '8px',
							padding: '15px',
							marginBottom: '20px'
						}}>
							<h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>📋 About Field Mapping</h4>
							<p style={{ margin: '0', fontSize: '14px', color: '#1565c0' }}>
								Field mapping allows you to define dynamic placeholders in your template that can be automatically 
								filled with data from procurement records. Use the format {`{{fieldName}}`} in your template content.
							</p>
						</div>

						<div style={{ marginBottom: '20px' }}>
							<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
								Add New Field
							</label>
							<div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
								<div style={{ flex: 1 }}>
									<input
										type="text"
										value={newFieldName}
										onChange={(e) => setNewFieldName(e.target.value)}
										placeholder="Enter field name (e.g., companyName, projectTitle)"
										style={{
											width: '100%',
											padding: '10px',
											border: '1px solid #ced4da',
											borderRadius: '4px',
											fontSize: '14px'
										}}
									/>
								</div>
								<button
									onClick={handleAddField}
									disabled={!newFieldName.trim()}
									style={{
										padding: '10px 16px',
										background: !newFieldName.trim() ? '#6c757d' : '#007bff',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										cursor: !newFieldName.trim() ? 'not-allowed' : 'pointer',
										fontSize: '14px',
										whiteSpace: 'nowrap'
									}}
								>
									➕ Add Field
								</button>
							</div>
						</div>

						<div>
							<h4 style={{ margin: '0 0 15px 0' }}>
								Current Fields ({selectedTemplate.fields ? selectedTemplate.fields.length : 0})
							</h4>
							
							{(!selectedTemplate.fields || selectedTemplate.fields.length === 0) ? (
								<div style={{
									textAlign: 'center',
									padding: '40px',
									color: '#6c757d',
									background: '#f8f9fa',
									borderRadius: '8px',
									border: '2px dashed #dee2e6'
								}}>
									<div style={{ fontSize: '48px', marginBottom: '15px' }}>🗺️</div>
									<h4 style={{ margin: '0 0 10px 0' }}>No Fields Mapped</h4>
									<p style={{ margin: '0', fontSize: '14px' }}>
										Add fields above to create dynamic placeholders for this template.
									</p>
								</div>
							) : (
								<div style={{
									background: '#f8f9fa',
									border: '1px solid #dee2e6',
									borderRadius: '8px',
									padding: '20px'
								}}>
									<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
										{selectedTemplate.fields.map((field, index) => (
											<div
												key={index}
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													padding: '12px',
													background: 'white',
													border: '1px solid #dee2e6',
													borderRadius: '6px'
												}}
											>
												<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
													<code style={{
														background: '#e9ecef',
														padding: '4px 8px',
														borderRadius: '4px',
														fontSize: '12px',
														color: '#495057'
													}}>
														{`{{${field}}}`}
													</code>
													<span style={{ fontSize: '14px', color: '#495057' }}>
														{field}
													</span>
												</div>
												<button
													onClick={() => handleRemoveField(field)}
													style={{
														background: '#dc3545',
														color: 'white',
														border: 'none',
														borderRadius: '4px',
														padding: '6px 8px',
														cursor: 'pointer',
														fontSize: '12px'
													}}
													title="Remove field"
												>
													🗑️
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						<div style={{
							display: 'flex',
							gap: '10px',
							justifyContent: 'flex-end',
							marginTop: '30px',
							paddingTop: '20px',
							borderTop: '1px solid #eee'
						}}>
							<button
								onClick={closeModals}
								style={{
									padding: '12px 24px',
									background: '#28a745',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: '500'
								}}
							>
								✅ Save Field Mapping
							</button>
						</div>
					</div>
				</div>
			</div>
		)}

		{/* CSS for hover effects */}
		<style jsx>{`
			.template-card:hover {
				box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
				transform: translateY(-2px);
			}
			
			.dropdown-container:hover .dropdown-menu {
				display: block;
			}
			
			@media (max-width: 768px) {
				.template-card {
					margin-bottom: 15px;
				}
			}
		`}</style>
	</div>
	);
};