import React, { useState, useEffect } from 'react';

/**
 * STEP Methods Page - STEP methodology configuration and management interface
 * 
 * Features:
 * - STEP methodology configuration (Screening, Technical, Economic, Procurement)
 * - Method templates and customization
 * - Evaluation criteria management
 * - Scoring systems and weightings
 * - Method validation and testing
 */

export default function StepMethodsPage() {
	const [activeTab, setActiveTab] = useState('overview');
	const [methods, setMethods] = useState([]);
	const [selectedMethod, setSelectedMethod] = useState(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [loading, setLoading] = useState(true);

	const tabs = [
		{ id: 'overview', name: 'Overview', icon: '📊' },
		{ id: 'screening', name: 'Screening', icon: '🔍' },
		{ id: 'technical', name: 'Technical', icon: '🔧' },
		{ id: 'economic', name: 'Economic', icon: '💰' },
		{ id: 'procurement', name: 'Procurement', icon: '📋' }
	];

	// Mock STEP methods data
	const mockMethods = [
		{
			id: 'METHOD-001',
			name: 'Standard Infrastructure STEP',
			description: 'Complete STEP methodology for infrastructure projects',
			category: 'Infrastructure',
			status: 'active',
			createdBy: 'System Admin',
			createdAt: '2024-01-15',
			lastModified: '2024-12-10',
			usageCount: 28,
			phases: {
				screening: {
					enabled: true,
					criteria: [
						{ id: 'legal', name: 'Legal Compliance', weight: 30, type: 'mandatory' },
						{ id: 'budget', name: 'Budget Availability', weight: 25, type: 'mandatory' },
						{ id: 'timeline', name: 'Timeline Feasibility', weight: 20, type: 'mandatory' },
						{ id: 'resources', name: 'Resource Availability', weight: 15, type: 'scored' },
						{ id: 'risk', name: 'Risk Assessment', weight: 10, type: 'scored' }
					],
					passingScore: 70
				},
				technical: {
					enabled: true,
					criteria: [
						{ id: 'specifications', name: 'Technical Specifications', weight: 35, type: 'scored' },
						{ id: 'quality', name: 'Quality Standards', weight: 25, type: 'scored' },
						{ id: 'innovation', name: 'Innovation Level', weight: 20, type: 'scored' },
						{ id: 'sustainability', name: 'Sustainability', weight: 20, type: 'scored' }
					],
					passingScore: 75
				},
				economic: {
					enabled: true,
					criteria: [
						{ id: 'cost', name: 'Total Cost', weight: 40, type: 'scored' },
						{ id: 'lifecycle', name: 'Lifecycle Cost', weight: 30, type: 'scored' },
						{ id: 'value', name: 'Value for Money', weight: 20, type: 'scored' },
						{ id: 'financing', name: 'Financing Terms', weight: 10, type: 'scored' }
					],
					passingScore: 70
				},
				procurement: {
					enabled: true,
					criteria: [
						{ id: 'delivery', name: 'Delivery Capability', weight: 25, type: 'scored' },
						{ id: 'experience', name: 'Past Experience', weight: 25, type: 'scored' },
						{ id: 'capacity', name: 'Organizational Capacity', weight: 20, type: 'scored' },
						{ id: 'references', name: 'References', weight: 15, type: 'scored' },
						{ id: 'compliance', name: 'Compliance Record', weight: 15, type: 'mandatory' }
					],
					passingScore: 75
				}
			}
		},
		{
			id: 'METHOD-002',
			name: 'IT Equipment STEP',
			description: 'STEP methodology optimized for IT equipment procurement',
			category: 'Technology',
			status: 'active',
			createdBy: 'IT Department',
			createdAt: '2024-02-20',
			lastModified: '2024-12-05',
			usageCount: 15,
			phases: {
				screening: {
					enabled: true,
					criteria: [
						{ id: 'compatibility', name: 'System Compatibility', weight: 35, type: 'mandatory' },
						{ id: 'budget', name: 'Budget Compliance', weight: 30, type: 'mandatory' },
						{ id: 'security', name: 'Security Requirements', weight: 25, type: 'mandatory' },
						{ id: 'standards', name: 'Industry Standards', weight: 10, type: 'scored' }
					],
					passingScore: 80
				},
				technical: {
					enabled: true,
					criteria: [
						{ id: 'performance', name: 'Performance Metrics', weight: 40, type: 'scored' },
						{ id: 'scalability', name: 'Scalability', weight: 25, type: 'scored' },
						{ id: 'integration', name: 'Integration Capability', weight: 20, type: 'scored' },
						{ id: 'support', name: 'Technical Support', weight: 15, type: 'scored' }
					],
					passingScore: 75
				},
				economic: {
					enabled: true,
					criteria: [
						{ id: 'price', name: 'Unit Price', weight: 35, type: 'scored' },
						{ id: 'maintenance', name: 'Maintenance Cost', weight: 25, type: 'scored' },
						{ id: 'upgrade', name: 'Upgrade Path Cost', weight: 20, type: 'scored' },
						{ id: 'training', name: 'Training Cost', weight: 20, type: 'scored' }
					],
					passingScore: 70
				},
				procurement: {
					enabled: true,
					criteria: [
						{ id: 'delivery', name: 'Delivery Time', weight: 30, type: 'scored' },
						{ id: 'warranty', name: 'Warranty Terms', weight: 25, type: 'scored' },
						{ id: 'vendor', name: 'Vendor Reliability', weight: 25, type: 'scored' },
						{ id: 'payment', name: 'Payment Terms', weight: 20, type: 'scored' }
					],
					passingScore: 75
				}
			}
		},
		{
			id: 'METHOD-003',
			name: 'Consulting Services STEP',
			description: 'STEP methodology for professional consulting services',
			category: 'Services',
			status: 'draft',
			createdBy: 'PMO',
			createdAt: '2024-11-15',
			lastModified: '2024-12-15',
			usageCount: 3,
			phases: {
				screening: {
					enabled: true,
					criteria: [
						{ id: 'qualifications', name: 'Required Qualifications', weight: 40, type: 'mandatory' },
						{ id: 'experience', name: 'Relevant Experience', weight: 30, type: 'mandatory' },
						{ id: 'availability', name: 'Availability', weight: 20, type: 'mandatory' },
						{ id: 'certification', name: 'Certifications', weight: 10, type: 'scored' }
					],
					passingScore: 75
				},
				technical: {
					enabled: true,
					criteria: [
						{ id: 'methodology', name: 'Proposed Methodology', weight: 35, type: 'scored' },
						{ id: 'expertise', name: 'Technical Expertise', weight: 30, type: 'scored' },
						{ id: 'innovation', name: 'Innovative Approach', weight: 20, type: 'scored' },
						{ id: 'tools', name: 'Tools & Technologies', weight: 15, type: 'scored' }
					],
					passingScore: 70
				},
				economic: {
					enabled: true,
					criteria: [
						{ id: 'fee', name: 'Professional Fee', weight: 50, type: 'scored' },
						{ id: 'expenses', name: 'Expected Expenses', weight: 25, type: 'scored' },
						{ id: 'value', name: 'Value Proposition', weight: 25, type: 'scored' }
					],
					passingScore: 70
				},
				procurement: {
					enabled: true,
					criteria: [
						{ id: 'timeline', name: 'Project Timeline', weight: 30, type: 'scored' },
						{ id: 'team', name: 'Team Composition', weight: 25, type: 'scored' },
						{ id: 'deliverables', name: 'Deliverables Quality', weight: 25, type: 'scored' },
						{ id: 'communication', name: 'Communication Plan', weight: 20, type: 'scored' }
					],
					passingScore: 75
				}
			}
		}
	];

	useEffect(() => {
		// Simulate loading methods
		setTimeout(() => {
			setMethods(mockMethods);
			setSelectedMethod(mockMethods[0]);
			setLoading(false);
		}, 1000);
	}, []);

	const handleCreateMethod = () => {
		setShowCreateModal(true);
	};

	const handleEditMethod = (method) => {
		setSelectedMethod(method);
	};

	const handleDuplicateMethod = (method) => {
		const duplicatedMethod = {
			...method,
			id: `METHOD-${String(methods.length + 1).padStart(3, '0')}`,
			name: `Copy of ${method.name}`,
			status: 'draft',
			createdAt: new Date().toISOString().split('T')[0],
			lastModified: new Date().toISOString().split('T')[0],
			usageCount: 0
		};
		
		setMethods([...methods, duplicatedMethod]);
		setSelectedMethod(duplicatedMethod);
	};

	const getStatusColor = (status) => {
		switch(status) {
			case 'active': return '#28a745';
			case 'draft': return '#ffc107';
			case 'archived': return '#6c757d';
			default: return '#6c757d';
		}
	};

	const getCriteriaTypeColor = (type) => {
		switch(type) {
			case 'mandatory': return '#dc3545';
			case 'scored': return '#007bff';
			default: return '#6c757d';
		}
	};

	const renderOverviewTab = () => (
		<div style={{ padding: '24px' }}>
			{/* Method Selection */}
			<div style={{ marginBottom: '24px' }}>
				<div style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '16px'
				}}>
					<h3 style={{ color: '#2c3e50' }}>STEP Methods</h3>
					<button
						onClick={handleCreateMethod}
						style={{
							padding: '8px 16px',
							background: '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '500'
						}}
					>
						+ Create Method
					</button>
				</div>

				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
					gap: '16px'
				}}>
					{methods.map(method => (
						<div
							key={method.id}
							style={{
								background: selectedMethod?.id === method.id ? '#e7f3ff' : '#ffffff',
								border: `1px solid ${selectedMethod?.id === method.id ? '#007bff' : '#dee2e6'}`,
								borderRadius: '8px',
								padding: '16px',
								cursor: 'pointer',
								transition: 'all 0.2s ease'
							}}
							onClick={() => setSelectedMethod(method)}
						>
							<div style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'flex-start',
								marginBottom: '8px'
							}}>
								<h4 style={{ margin: 0, color: '#2c3e50' }}>{method.name}</h4>
								<span style={{
									background: getStatusColor(method.status),
									color: 'white',
									padding: '2px 8px',
									borderRadius: '12px',
									fontSize: '11px',
									fontWeight: '600'
								}}>
									{method.status.toUpperCase()}
								</span>
							</div>
							
							<p style={{
								margin: '8px 0',
								color: '#6c757d',
								fontSize: '14px',
								lineHeight: '1.4'
							}}>
								{method.description}
							</p>

							<div style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								fontSize: '12px',
								color: '#6c757d'
							}}>
								<span>Used {method.usageCount} times</span>
								<span>{method.category}</span>
							</div>

							<div style={{
								display: 'flex',
								gap: '8px',
								marginTop: '12px'
							}}>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleEditMethod(method);
									}}
									style={{
										flex: 1,
										padding: '6px 12px',
										background: '#007bff',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										cursor: 'pointer',
										fontSize: '12px'
									}}
								>
									Edit
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleDuplicateMethod(method);
									}}
									style={{
										flex: 1,
										padding: '6px 12px',
										background: '#28a745',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										cursor: 'pointer',
										fontSize: '12px'
									}}
								>
									Duplicate
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Selected Method Details */}
			{selectedMethod && (
				<div style={{
					background: '#f8f9fa',
					border: '1px solid #dee2e6',
					borderRadius: '8px',
					padding: '20px'
				}}>
					<h4 style={{ marginBottom: '16px', color: '#2c3e50' }}>
						Method Configuration: {selectedMethod.name}
					</h4>
					
					<div style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
						gap: '16px'
					}}>
						{Object.entries(selectedMethod.phases).map(([phaseKey, phase]) => {
							if (!phase.enabled) return null;
							
							const phaseNames = {
								screening: 'Screening',
								technical: 'Technical',
								economic: 'Economic',
								procurement: 'Procurement'
							};

							return (
								<div
									key={phaseKey}
									style={{
										background: '#ffffff',
										border: '1px solid #dee2e6',
										borderRadius: '6px',
										padding: '16px'
									}}
								>
									<h5 style={{ marginBottom: '12px', color: '#495057' }}>
										{phaseNames[phaseKey]}
									</h5>
									<div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
										{phase.criteria.length} criteria
									</div>
									<div style={{ fontSize: '12px', color: '#6c757d' }}>
										Passing score: {phase.passingScore}%
									</div>
									<div style={{
										marginTop: '8px',
										display: 'flex',
										gap: '4px',
										flexWrap: 'wrap'
									}}>
										{phase.criteria.slice(0, 3).map(criterion => (
											<span
												key={criterion.id}
												style={{
													background: getCriteriaTypeColor(criterion.type),
													color: 'white',
													padding: '2px 6px',
													borderRadius: '10px',
													fontSize: '10px',
													fontWeight: '500'
												}}
											>
												{criterion.name}
											</span>
										))}
										{phase.criteria.length > 3 && (
											<span style={{ fontSize: '10px', color: '#6c757d' }}>
												+{phase.criteria.length - 3}
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);

	const renderPhaseTab = (phaseKey) => {
		if (!selectedMethod) {
			return (
				<div style={{
					padding: '40px',
					textAlign: 'center',
					color: '#6c757d'
				}}>
					<p>Please select a method to configure this phase.</p>
				</div>
			);
		}

		const phase = selectedMethod.phases[phaseKey];
		const phaseNames = {
			screening: 'Screening Phase',
			technical: 'Technical Evaluation',
			economic: 'Economic Analysis',
			procurement: 'Procurement Assessment'
		};

		return (
			<div style={{ padding: '24px' }}>
				<div style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '24px'
				}}>
					<div>
						<h3 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>
							{phaseNames[phaseKey]}
						</h3>
						<p style={{ margin: 0, color: '#6c757d' }}>
							Method: {selectedMethod.name}
						</p>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
						<label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<input
								type="checkbox"
								checked={phase.enabled}
								onChange={() => {}} // Would handle enable/disable
								style={{ transform: 'scale(1.2)' }}
							/>
							<span style={{ fontSize: '14px', color: '#495057' }}>Enable Phase</span>
						</label>
					</div>
				</div>

				{phase.enabled ? (
					<>
						{/* Phase Configuration */}
						<div style={{
							background: '#f8f9fa',
							border: '1px solid #dee2e6',
							borderRadius: '8px',
							padding: '20px',
							marginBottom: '24px'
						}}>
							<h4 style={{ marginBottom: '16px', color: '#495057' }}>Phase Settings</h4>
							<div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', alignItems: 'center' }}>
								<label style={{ fontWeight: '500', color: '#495057' }}>Passing Score:</label>
								<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
									<input
										type="range"
										min="0"
										max="100"
										value={phase.passingScore}
										onChange={() => {}} // Would handle score change
										style={{ flex: 1 }}
									/>
									<span style={{ fontWeight: '600', color: '#007bff' }}>
										{phase.passingScore}%
									</span>
								</div>
							</div>
						</div>

						{/* Evaluation Criteria */}
						<div style={{
							background: '#ffffff',
							border: '1px solid #dee2e6',
							borderRadius: '8px',
							overflow: 'hidden'
						}}>
							<div style={{
								background: '#f8f9fa',
								padding: '16px',
								borderBottom: '1px solid #dee2e6'
							}}>
								<div style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center'
								}}>
									<h4 style={{ margin: 0, color: '#495057' }}>Evaluation Criteria</h4>
									<button
										style={{
											padding: '6px 12px',
											background: '#28a745',
											color: 'white',
											border: 'none',
											borderRadius: '4px',
											cursor: 'pointer',
											fontSize: '12px'
										}}
									>
										+ Add Criterion
									</button>
								</div>
							</div>

							<div style={{ padding: '0' }}>
								{phase.criteria.map((criterion, index) => (
									<div
										key={criterion.id}
										style={{
											display: 'grid',
											gridTemplateColumns: '1fr 100px 100px 80px 60px',
											alignItems: 'center',
											padding: '16px',
											borderBottom: index < phase.criteria.length - 1 ? '1px solid #f0f0f0' : 'none',
											gap: '16px'
										}}
									>
										<div>
											<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
												{criterion.name}
											</div>
											<div style={{
												background: getCriteriaTypeColor(criterion.type),
												color: 'white',
												padding: '2px 8px',
												borderRadius: '12px',
												fontSize: '11px',
												fontWeight: '600',
												display: 'inline-block'
											}}>
												{criterion.type.toUpperCase()}
											</div>
										</div>
										
										<div style={{ textAlign: 'center' }}>
											<input
												type="number"
												value={criterion.weight}
												onChange={() => {}} // Would handle weight change
												style={{
													width: '60px',
													padding: '4px',
													border: '1px solid #ced4da',
													borderRadius: '4px',
													textAlign: 'center',
													fontSize: '12px'
												}}
											/>
											<div style={{ fontSize: '11px', color: '#6c757d' }}>Weight</div>
										</div>
										
										<div style={{ textAlign: 'center' }}>
											<select
												value={criterion.type}
												onChange={() => {}} // Would handle type change
												style={{
													padding: '4px',
													border: '1px solid #ced4da',
													borderRadius: '4px',
													fontSize: '12px',
													width: '90px'
												}}
											>
												<option value="mandatory">Mandatory</option>
												<option value="scored">Scored</option>
											</select>
										</div>
										
										<div style={{ textAlign: 'center' }}>
											<button
												style={{
													padding: '4px 8px',
													background: '#007bff',
													color: 'white',
													border: 'none',
													borderRadius: '4px',
													cursor: 'pointer',
													fontSize: '11px'
												}}
											>
												Edit
											</button>
										</div>
										
										<div style={{ textAlign: 'center' }}>
											<button
												style={{
													padding: '4px 8px',
													background: '#dc3545',
													color: 'white',
													border: 'none',
													borderRadius: '4px',
													cursor: 'pointer',
													fontSize: '11px'
												}}
											>
												×
											</button>
										</div>
									</div>
								))}
							</div>

							{/* Criteria Summary */}
							<div style={{
								background: '#f8f9fa',
								padding: '12px 16px',
								borderTop: '1px solid #dee2e6',
								fontSize: '13px',
								color: '#6c757d'
							}}>
								Total Weight: {phase.criteria.reduce((sum, c) => sum + c.weight, 0)}% |
								Mandatory: {phase.criteria.filter(c => c.type === 'mandatory').length} |
								Scored: {phase.criteria.filter(c => c.type === 'scored').length}
							</div>
						</div>
					</>
				) : (
					<div style={{
						textAlign: 'center',
						padding: '40px',
						color: '#6c757d'
					}}>
						<p>This phase is currently disabled.</p>
						<p style={{ fontSize: '14px' }}>
							Enable the phase to configure evaluation criteria and settings.
						</p>
					</div>
				)}
			</div>
		);
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
				Loading STEP methods...
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
							⚙️ STEP Methods
						</h1>
						<p style={{
							margin: 0,
							color: '#6c757d',
							fontSize: '16px'
						}}>
							Configure STEP methodology for procurement evaluation (Screening, Technical, Economic, Procurement)
						</p>
					</div>

					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

			{/* Statistics */}
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
						{methods.length}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						STEP Methods
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
						{methods.filter(m => m.status === 'active').length}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Active Methods
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
						{methods.reduce((sum, m) => sum + m.usageCount, 0)}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Total Usage
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
						{selectedMethod ? Object.values(selectedMethod.phases).reduce((sum, p) => sum + (p.enabled ? p.criteria.length : 0), 0) : 0}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Total Criteria
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div style={{
				background: '#ffffff',
				borderRadius: '12px',
				border: '1px solid #dee2e6',
				overflow: 'hidden'
			}}>
				{/* Tab Navigation */}
				<div style={{
					display: 'flex',
					background: '#f8f9fa',
					borderBottom: '1px solid #dee2e6'
				}}>
					{tabs.map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							style={{
								flex: 1,
								padding: '16px',
								background: activeTab === tab.id ? '#ffffff' : 'transparent',
								color: activeTab === tab.id ? '#007bff' : '#6c757d',
								border: 'none',
								borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: '500',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '8px'
							}}
						>
							{tab.icon} {tab.name}
						</button>
					))}
				</div>

				{/* Tab Content */}
				<div>
					{activeTab === 'overview' && renderOverviewTab()}
					{activeTab === 'screening' && renderPhaseTab('screening')}
					{activeTab === 'technical' && renderPhaseTab('technical')}
					{activeTab === 'economic' && renderPhaseTab('economic')}
					{activeTab === 'procurement' && renderPhaseTab('procurement')}
				</div>
			</div>

			{/* Create Method Modal */}
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
							Create New STEP Method
						</h3>
						<p style={{ marginBottom: '24px', color: '#6c757d' }}>
							Choose how you'd like to create your new STEP evaluation method:
						</p>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							<button
								onClick={() => {
									setShowCreateModal(false);
									// Would navigate to method creation form
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
								⚙️ Create from Scratch
								<div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
									Build a new STEP method with custom phases and criteria
								</div>
							</button>

							<button
								onClick={() => {
									setShowCreateModal(false);
									// Would show template selection
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
								📋 Use Template
								<div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
									Start with a pre-built method template
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