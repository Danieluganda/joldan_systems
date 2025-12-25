import React, { useState, useEffect } from 'react';

/**
 * Plan Templates Page - Template management specific to procurement plans
 * 
 * Features:
 * - Browse and manage procurement plan templates
 * - Template preview and customization
 * - Create new templates from existing plans
 * - Template categories and search
 * - Template usage statistics
 */

export default function PlanTemplatesPage() {
	const [templates, setTemplates] = useState([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('all');
	const [selectedTemplate, setSelectedTemplate] = useState(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isPreviewMode, setIsPreviewMode] = useState(false);

	const categories = [
		{ id: 'all', name: 'All Templates', count: 24 },
		{ id: 'infrastructure', name: 'Infrastructure', count: 8 },
		{ id: 'technology', name: 'Technology', count: 6 },
		{ id: 'healthcare', name: 'Healthcare', count: 4 },
		{ id: 'office-supplies', name: 'Office Supplies', count: 3 },
		{ id: 'consulting', name: 'Consulting Services', count: 3 }
	];

	// Mock templates data
	const mockTemplates = [
		{
			id: 'TPL-001',
			name: 'Standard Infrastructure Plan',
			description: 'Comprehensive template for infrastructure procurement including roads, utilities, and buildings',
			category: 'infrastructure',
			createdBy: 'System Admin',
			createdAt: '2024-01-15',
			lastUsed: '2024-12-20',
			usageCount: 45,
			estimatedBudget: 2500000,
			duration: '18-24 months',
			complexity: 'High',
			tags: ['infrastructure', 'construction', 'utilities'],
			sections: [
				'Project Overview',
				'Technical Specifications',
				'Budget Breakdown',
				'Timeline & Milestones',
				'Risk Assessment',
				'Compliance Requirements'
			],
			fields: [
				{ name: 'projectName', label: 'Project Name', type: 'text', required: true },
				{ name: 'location', label: 'Location', type: 'text', required: true },
				{ name: 'scope', label: 'Project Scope', type: 'textarea', required: true },
				{ name: 'budget', label: 'Total Budget', type: 'number', required: true },
				{ name: 'startDate', label: 'Start Date', type: 'date', required: true },
				{ name: 'endDate', label: 'End Date', type: 'date', required: true }
			]
		},
		{
			id: 'TPL-002',
			name: 'IT Equipment Procurement',
			description: 'Template for technology equipment procurement including computers, servers, and software',
			category: 'technology',
			createdBy: 'IT Department',
			createdAt: '2024-02-10',
			lastUsed: '2024-12-18',
			usageCount: 32,
			estimatedBudget: 750000,
			duration: '6-8 months',
			complexity: 'Medium',
			tags: ['technology', 'equipment', 'software'],
			sections: [
				'Requirements Analysis',
				'Technical Specifications',
				'Vendor Evaluation',
				'Cost Analysis',
				'Implementation Plan'
			],
			fields: [
				{ name: 'equipmentType', label: 'Equipment Type', type: 'select', required: true },
				{ name: 'quantity', label: 'Quantity', type: 'number', required: true },
				{ name: 'specifications', label: 'Technical Specifications', type: 'textarea', required: true },
				{ name: 'budget', label: 'Budget', type: 'number', required: true }
			]
		},
		{
			id: 'TPL-003',
			name: 'Medical Equipment Plan',
			description: 'Healthcare equipment procurement template with regulatory compliance focus',
			category: 'healthcare',
			createdBy: 'Health Services',
			createdAt: '2024-01-20',
			lastUsed: '2024-12-15',
			usageCount: 18,
			estimatedBudget: 1200000,
			duration: '12-15 months',
			complexity: 'High',
			tags: ['healthcare', 'medical', 'regulatory'],
			sections: [
				'Medical Requirements',
				'Regulatory Compliance',
				'Clinical Validation',
				'Budget & Financing',
				'Installation & Training'
			],
			fields: [
				{ name: 'equipmentCategory', label: 'Equipment Category', type: 'select', required: true },
				{ name: 'clinicalUse', label: 'Clinical Use Case', type: 'textarea', required: true },
				{ name: 'regulatoryReq', label: 'Regulatory Requirements', type: 'textarea', required: true },
				{ name: 'budget', label: 'Budget', type: 'number', required: true }
			]
		},
		{
			id: 'TPL-004',
			name: 'Office Supplies Annual',
			description: 'Annual office supplies procurement template with bulk ordering optimization',
			category: 'office-supplies',
			createdBy: 'Administration',
			createdAt: '2024-03-01',
			lastUsed: '2024-12-10',
			usageCount: 28,
			estimatedBudget: 150000,
			duration: '3-4 months',
			complexity: 'Low',
			tags: ['office-supplies', 'bulk', 'annual'],
			sections: [
				'Supply Categories',
				'Quantity Planning',
				'Vendor Selection',
				'Cost Optimization',
				'Delivery Schedule'
			],
			fields: [
				{ name: 'department', label: 'Department', type: 'text', required: true },
				{ name: 'period', label: 'Supply Period', type: 'text', required: true },
				{ name: 'categories', label: 'Supply Categories', type: 'multiselect', required: true }
			]
		},
		{
			id: 'TPL-005',
			name: 'Consulting Services',
			description: 'Professional consulting services procurement with performance metrics',
			category: 'consulting',
			createdBy: 'Project Management Office',
			createdAt: '2024-02-15',
			lastUsed: '2024-12-08',
			usageCount: 15,
			estimatedBudget: 500000,
			duration: '8-12 months',
			complexity: 'Medium',
			tags: ['consulting', 'services', 'expertise'],
			sections: [
				'Service Requirements',
				'Consultant Qualifications',
				'Deliverables & Timeline',
				'Performance Metrics',
				'Contract Terms'
			],
			fields: [
				{ name: 'serviceType', label: 'Service Type', type: 'select', required: true },
				{ name: 'expertise', label: 'Required Expertise', type: 'textarea', required: true },
				{ name: 'deliverables', label: 'Expected Deliverables', type: 'textarea', required: true }
			]
		},
		{
			id: 'TPL-006',
			name: 'Construction Projects',
			description: 'Large-scale construction projects with environmental compliance',
			category: 'infrastructure',
			createdBy: 'Engineering Department',
			createdAt: '2024-01-25',
			lastUsed: '2024-12-05',
			usageCount: 12,
			estimatedBudget: 5000000,
			duration: '24-36 months',
			complexity: 'High',
			tags: ['construction', 'infrastructure', 'environmental'],
			sections: [
				'Project Scope',
				'Environmental Assessment',
				'Construction Specifications',
				'Safety Requirements',
				'Quality Assurance'
			],
			fields: [
				{ name: 'constructionType', label: 'Construction Type', type: 'select', required: true },
				{ name: 'location', label: 'Project Location', type: 'text', required: true },
				{ name: 'scope', label: 'Project Scope', type: 'textarea', required: true }
			]
		}
	];

	useEffect(() => {
		// Simulate loading templates
		setTimeout(() => {
			setTemplates(mockTemplates);
			setLoading(false);
		}, 1000);
	}, []);

	const filteredTemplates = templates.filter(template => {
		const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
		
		const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
		
		return matchesSearch && matchesCategory;
	});

	const handleUseTemplate = (template) => {
		// Navigate to create plan with template
		window.location.href = `/plans/create?template=${template.id}`;
	};

	const handlePreviewTemplate = (template) => {
		setSelectedTemplate(template);
		setIsPreviewMode(true);
	};

	const handleCreateTemplate = () => {
		setShowCreateModal(true);
	};

	const getComplexityColor = (complexity) => {
		switch(complexity) {
			case 'Low': return '#28a745';
			case 'Medium': return '#ffc107';
			case 'High': return '#dc3545';
			default: return '#6c757d';
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	};

	if (loading) {
		return (
			<div style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				height: '400px',
				fontSize: '18px',
				color: '#6c757d'
			}}>
				Loading templates...
			</div>
		);
	}

	return (
		<div style={{
			padding: '24px',
			background: '#f8f9fa',
			minHeight: '100vh'
		}}>
			{/* Header */}
			<div style={{
				background: '#ffffff',
				borderRadius: '12px',
				padding: '32px',
				marginBottom: '24px',
				border: '1px solid #dee2e6',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
			}}>
				<div style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: '16px'
				}}>
					<div>
						<h1 style={{
							margin: '0 0 8px 0',
							fontSize: '28px',
							fontWeight: '700',
							color: '#2c3e50'
						}}>
							📋 Plan Templates
						</h1>
						<p style={{
							margin: 0,
							color: '#6c757d',
							fontSize: '16px'
						}}>
							Browse and use pre-built templates for your procurement plans
						</p>
					</div>

					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<button
							onClick={handleCreateTemplate}
							style={{
								padding: '12px 24px',
								background: '#28a745',
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
							✨ Create Template
						</button>

						<button
							onClick={() => window.location.href = '/plans'}
							style={{
								padding: '12px 24px',
								background: '#6c757d',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: '500'
							}}
						>
							← Back to Plans
						</button>
					</div>
				</div>
			</div>

			{/* Statistics Cards */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
				gap: '16px',
				marginBottom: '24px'
			}}>
				<div style={{
					background: '#ffffff',
					borderRadius: '12px',
					padding: '20px',
					border: '1px solid #dee2e6',
					textAlign: 'center'
				}}>
					<div style={{ fontSize: '32px', fontWeight: '700', color: '#007bff', marginBottom: '8px' }}>
						{templates.length}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Total Templates
					</div>
				</div>

				<div style={{
					background: '#ffffff',
					borderRadius: '12px',
					padding: '20px',
					border: '1px solid #dee2e6',
					textAlign: 'center'
				}}>
					<div style={{ fontSize: '32px', fontWeight: '700', color: '#28a745', marginBottom: '8px' }}>
						{templates.reduce((sum, t) => sum + t.usageCount, 0)}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Total Uses
					</div>
				</div>

				<div style={{
					background: '#ffffff',
					borderRadius: '12px',
					padding: '20px',
					border: '1px solid #dee2e6',
					textAlign: 'center'
				}}>
					<div style={{ fontSize: '32px', fontWeight: '700', color: '#ffc107', marginBottom: '8px' }}>
						{Math.round(templates.reduce((sum, t) => sum + t.usageCount, 0) / templates.length)}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Average Uses
					</div>
				</div>

				<div style={{
					background: '#ffffff',
					borderRadius: '12px',
					padding: '20px',
					border: '1px solid #dee2e6',
					textAlign: 'center'
				}}>
					<div style={{ fontSize: '32px', fontWeight: '700', color: '#dc3545', marginBottom: '8px' }}>
						{formatCurrency(templates.reduce((sum, t) => sum + t.estimatedBudget, 0) / templates.length)}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Average Budget
					</div>
				</div>
			</div>

			{/* Filters and Search */}
			<div style={{
				background: '#ffffff',
				borderRadius: '12px',
				padding: '24px',
				marginBottom: '24px',
				border: '1px solid #dee2e6'
			}}>
				<div style={{
					display: 'grid',
					gridTemplateColumns: '1fr auto',
					gap: '16px',
					alignItems: 'end',
					marginBottom: '20px'
				}}>
					<div>
						<label style={{
							display: 'block',
							marginBottom: '8px',
							fontWeight: '500',
							color: '#495057'
						}}>
							🔍 Search Templates
						</label>
						<input
							type="text"
							placeholder="Search by name, description, or tags..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{
								width: '100%',
								padding: '12px 16px',
								border: '1px solid #ced4da',
								borderRadius: '8px',
								fontSize: '14px'
							}}
						/>
					</div>
				</div>

				{/* Category Filters */}
				<div>
					<label style={{
						display: 'block',
						marginBottom: '12px',
						fontWeight: '500',
						color: '#495057'
					}}>
						📂 Categories
					</label>
					<div style={{
						display: 'flex',
						gap: '8px',
						flexWrap: 'wrap'
					}}>
						{categories.map(category => (
							<button
								key={category.id}
								onClick={() => setSelectedCategory(category.id)}
								style={{
									padding: '8px 16px',
									background: selectedCategory === category.id ? '#007bff' : '#f8f9fa',
									color: selectedCategory === category.id ? 'white' : '#495057',
									border: `1px solid ${selectedCategory === category.id ? '#007bff' : '#dee2e6'}`,
									borderRadius: '20px',
									cursor: 'pointer',
									fontSize: '13px',
									fontWeight: '500',
									display: 'flex',
									alignItems: 'center',
									gap: '6px'
								}}
							>
								{category.name}
								<span style={{
									background: selectedCategory === category.id ? 'rgba(255,255,255,0.2)' : '#e9ecef',
									color: selectedCategory === category.id ? 'white' : '#6c757d',
									padding: '2px 6px',
									borderRadius: '10px',
									fontSize: '11px',
									fontWeight: '600'
								}}>
									{category.count}
								</span>
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Templates Grid */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
				gap: '20px'
			}}>
				{filteredTemplates.map(template => (
					<div
						key={template.id}
						style={{
							background: '#ffffff',
							borderRadius: '12px',
							border: '1px solid #dee2e6',
							overflow: 'hidden',
							transition: 'all 0.2s ease',
							cursor: 'pointer'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
							e.currentTarget.style.transform = 'translateY(-2px)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.boxShadow = 'none';
							e.currentTarget.style.transform = 'translateY(0)';
						}}
					>
						{/* Template Header */}
						<div style={{
							padding: '20px 20px 16px',
							borderBottom: '1px solid #f0f0f0'
						}}>
							<div style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'flex-start',
								marginBottom: '12px'
							}}>
								<div>
									<div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
										{template.id}
									</div>
									<h3 style={{
										margin: 0,
										fontSize: '18px',
										fontWeight: '600',
										color: '#2c3e50',
										lineHeight: '1.3'
									}}>
										{template.name}
									</h3>
								</div>

								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}>
									<span style={{
										background: getComplexityColor(template.complexity),
										color: 'white',
										padding: '4px 8px',
										borderRadius: '12px',
										fontSize: '11px',
										fontWeight: '600'
									}}>
										{template.complexity}
									</span>
								</div>
							</div>

							<p style={{
								margin: '0 0 12px 0',
								color: '#6c757d',
								fontSize: '14px',
								lineHeight: '1.4',
								height: '40px',
								overflow: 'hidden',
								display: '-webkit-box',
								WebkitLineClamp: 2,
								WebkitBoxOrient: 'vertical'
							}}>
								{template.description}
							</p>

							{/* Tags */}
							<div style={{
								display: 'flex',
								gap: '6px',
								flexWrap: 'wrap',
								marginBottom: '16px'
							}}>
								{template.tags.slice(0, 3).map(tag => (
									<span
										key={tag}
										style={{
											background: '#e7f3ff',
											color: '#0066cc',
											padding: '4px 8px',
											borderRadius: '12px',
											fontSize: '11px',
											fontWeight: '500'
										}}
									>
										#{tag}
									</span>
								))}
								{template.tags.length > 3 && (
									<span style={{
										color: '#6c757d',
										fontSize: '11px',
										padding: '4px 0'
									}}>
										+{template.tags.length - 3} more
									</span>
								)}
							</div>

							{/* Stats */}
							<div style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '12px',
								fontSize: '13px'
							}}>
								<div>
									<div style={{ color: '#6c757d' }}>Estimated Budget</div>
									<div style={{ fontWeight: '600', color: '#495057' }}>
										{formatCurrency(template.estimatedBudget)}
									</div>
								</div>
								<div>
									<div style={{ color: '#6c757d' }}>Duration</div>
									<div style={{ fontWeight: '600', color: '#495057' }}>
										{template.duration}
									</div>
								</div>
								<div>
									<div style={{ color: '#6c757d' }}>Used</div>
									<div style={{ fontWeight: '600', color: '#495057' }}>
										{template.usageCount} times
									</div>
								</div>
								<div>
									<div style={{ color: '#6c757d' }}>Last Used</div>
									<div style={{ fontWeight: '600', color: '#495057' }}>
										{new Date(template.lastUsed).toLocaleDateString()}
									</div>
								</div>
							</div>
						</div>

						{/* Template Actions */}
						<div style={{ padding: '16px 20px' }}>
							<div style={{
								display: 'flex',
								gap: '8px'
							}}>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleUseTemplate(template);
									}}
									style={{
										flex: 1,
										padding: '10px 16px',
										background: '#007bff',
										color: 'white',
										border: 'none',
										borderRadius: '6px',
										cursor: 'pointer',
										fontSize: '14px',
										fontWeight: '500',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: '6px'
									}}
								>
									🚀 Use Template
								</button>

								<button
									onClick={(e) => {
										e.stopPropagation();
										handlePreviewTemplate(template);
									}}
									style={{
										padding: '10px 16px',
										background: '#f8f9fa',
										color: '#495057',
										border: '1px solid #dee2e6',
										borderRadius: '6px',
										cursor: 'pointer',
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									👁️ Preview
								</button>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* No Results */}
			{filteredTemplates.length === 0 && (
				<div style={{
					textAlign: 'center',
					padding: '60px 20px',
					color: '#6c757d'
				}}>
					<div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
					<h3 style={{ marginBottom: '8px', color: '#495057' }}>
						No Templates Found
					</h3>
					<p style={{ marginBottom: '20px' }}>
						Try adjusting your search criteria or browse different categories.
					</p>
					<button
						onClick={() => {
							setSearchQuery('');
							setSelectedCategory('all');
						}}
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
						Clear Filters
					</button>
				</div>
			)}

			{/* Template Preview Modal */}
			{isPreviewMode && selectedTemplate && (
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
						background: '#ffffff',
						borderRadius: '12px',
						maxWidth: '800px',
						maxHeight: '90vh',
						width: '100%',
						overflow: 'auto'
					}}>
						{/* Modal Header */}
						<div style={{
							padding: '24px',
							borderBottom: '1px solid #dee2e6',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center'
						}}>
							<div>
								<h2 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>
									{selectedTemplate.name}
								</h2>
								<p style={{ margin: 0, color: '#6c757d' }}>
									Template Preview
								</p>
							</div>
							<button
								onClick={() => setIsPreviewMode(false)}
								style={{
									background: 'none',
									border: 'none',
									fontSize: '24px',
									cursor: 'pointer',
									padding: '4px',
									color: '#6c757d'
								}}
							>
								×
							</button>
						</div>

						{/* Modal Content */}
						<div style={{ padding: '24px' }}>
							<div style={{ marginBottom: '24px' }}>
								<h4 style={{ marginBottom: '8px', color: '#495057' }}>Description</h4>
								<p style={{ color: '#6c757d', lineHeight: '1.5' }}>
									{selectedTemplate.description}
								</p>
							</div>

							<div style={{ marginBottom: '24px' }}>
								<h4 style={{ marginBottom: '12px', color: '#495057' }}>Template Sections</h4>
								<div style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
									gap: '8px'
								}}>
									{selectedTemplate.sections.map((section, index) => (
										<div
											key={index}
											style={{
												background: '#f8f9fa',
												padding: '8px 12px',
												borderRadius: '6px',
												fontSize: '14px',
												color: '#495057'
											}}
										>
											{section}
										</div>
									))}
								</div>
							</div>

							<div style={{ marginBottom: '24px' }}>
								<h4 style={{ marginBottom: '12px', color: '#495057' }}>Required Fields</h4>
								<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
									{selectedTemplate.fields.map((field, index) => (
										<div
											key={index}
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												padding: '8px 12px',
												background: '#f8f9fa',
												borderRadius: '6px'
											}}
										>
											<span style={{ fontWeight: '500', color: '#495057' }}>
												{field.label}
												{field.required && <span style={{ color: '#dc3545' }}> *</span>}
											</span>
											<span style={{
												background: '#e9ecef',
												color: '#6c757d',
												padding: '2px 8px',
												borderRadius: '12px',
												fontSize: '12px'
											}}>
												{field.type}
											</span>
										</div>
									))}
								</div>
							</div>

							<div style={{
								display: 'flex',
								justifyContent: 'flex-end',
								gap: '12px'
							}}>
								<button
									onClick={() => setIsPreviewMode(false)}
									style={{
										padding: '12px 24px',
										background: '#6c757d',
										color: 'white',
										border: 'none',
										borderRadius: '8px',
										cursor: 'pointer',
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									Close
								</button>
								
								<button
									onClick={() => handleUseTemplate(selectedTemplate)}
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
									Use This Template
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Create Template Modal */}
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
						background: '#ffffff',
						borderRadius: '12px',
						padding: '24px',
						maxWidth: '500px',
						width: '100%'
					}}>
						<h3 style={{ marginBottom: '16px', color: '#2c3e50' }}>
							Create New Template
						</h3>
						<p style={{ marginBottom: '24px', color: '#6c757d' }}>
							Choose how you'd like to create your new template:
						</p>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							<button
								onClick={() => {
									setShowCreateModal(false);
									window.location.href = '/plans/templates/create';
								}}
								style={{
									padding: '16px',
									background: '#007bff',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									textAlign: 'left'
								}}
							>
								📝 Create from Scratch
								<div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
									Build a new template with custom fields and sections
								</div>
							</button>

							<button
								onClick={() => {
									setShowCreateModal(false);
									window.location.href = '/plans?create_template=true';
								}}
								style={{
									padding: '16px',
									background: '#28a745',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									textAlign: 'left'
								}}
							>
								📋 Create from Existing Plan
								<div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
									Convert an existing plan into a reusable template
								</div>
							</button>

							<button
								onClick={() => setShowCreateModal(false)}
								style={{
									padding: '12px 24px',
									background: '#6c757d',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									marginTop: '12px'
								}}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}