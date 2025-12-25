import React, { useState } from 'react';

/**
 * Create Plan Page - Form for creating new procurement plans
 * 
 * Features:
 * - Multi-step form for plan creation
 * - Plan details and configuration
 * - Budget allocation
 * - Item listing
 * - Validation and submission
 */

export default function CreatePlanPage() {
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		// Basic Information
		title: '',
		description: '',
		category: '',
		department: '',
		year: new Date().getFullYear().toString(),
		priority: 'medium',
		
		// Budget Information
		totalBudget: '',
		approvedBudget: '',
		currencyCode: 'USD',
		budgetSource: '',
		
		// Planning Details
		planningPeriod: {
			startDate: '',
			endDate: ''
		},
		implementationPeriod: {
			startDate: '',
			endDate: ''
		},
		reviewFrequency: 'quarterly',
		
		// Approval Workflow
		requiresApproval: true,
		approvalLevels: [],
		
		// Items
		items: []
	});

	const [errors, setErrors] = useState({});

	const steps = [
		{ id: 1, title: 'Basic Information', icon: '📋' },
		{ id: 2, title: 'Budget & Timeline', icon: '💰' },
		{ id: 3, title: 'Planning Items', icon: '📝' },
		{ id: 4, title: 'Review & Submit', icon: '✅' }
	];

	const categories = [
		'Infrastructure',
		'Technology',
		'Healthcare',
		'Education',
		'Transportation',
		'Security',
		'Environmental',
		'Consulting Services',
		'Office Supplies',
		'Equipment & Machinery'
	];

	const departments = [
		'Public Works',
		'IT Department',
		'Health Services',
		'Education Department',
		'Transportation Authority',
		'Environmental Services',
		'Finance Department',
		'Human Resources',
		'Legal Department',
		'Administration'
	];

	const priorities = [
		{ value: 'low', label: 'Low', color: '#6c757d' },
		{ value: 'medium', label: 'Medium', color: '#ffc107' },
		{ value: 'high', label: 'High', color: '#fd7e14' },
		{ value: 'critical', label: 'Critical', color: '#dc3545' }
	];

	const reviewFrequencies = [
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'quarterly', label: 'Quarterly' },
		{ value: 'semi-annually', label: 'Semi-annually' },
		{ value: 'annually', label: 'Annually' }
	];

	// Form handlers
	const handleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));

		// Clear error if field is being corrected
		if (errors[field]) {
			setErrors(prev => ({
				...prev,
				[field]: null
			}));
		}
	};

	const handleNestedInputChange = (parent, field, value) => {
		setFormData(prev => ({
			...prev,
			[parent]: {
				...prev[parent],
				[field]: value
			}
		}));
	};

	const addPlanItem = () => {
		const newItem = {
			id: Date.now().toString(),
			title: '',
			description: '',
			category: '',
			estimatedCost: '',
			quantity: 1,
			unit: '',
			priority: 'medium',
			targetDate: '',
			specifications: ''
		};

		setFormData(prev => ({
			...prev,
			items: [...prev.items, newItem]
		}));
	};

	const updatePlanItem = (itemId, field, value) => {
		setFormData(prev => ({
			...prev,
			items: prev.items.map(item =>
				item.id === itemId ? { ...item, [field]: value } : item
			)
		}));
	};

	const removePlanItem = (itemId) => {
		setFormData(prev => ({
			...prev,
			items: prev.items.filter(item => item.id !== itemId)
		}));
	};

	// Validation
	const validateStep = (step) => {
		const newErrors = {};

		if (step === 1) {
			if (!formData.title?.trim()) newErrors.title = 'Plan title is required';
			if (!formData.description?.trim()) newErrors.description = 'Description is required';
			if (!formData.category) newErrors.category = 'Category is required';
			if (!formData.department) newErrors.department = 'Department is required';
		}

		if (step === 2) {
			if (!formData.totalBudget || parseFloat(formData.totalBudget) <= 0) {
				newErrors.totalBudget = 'Valid total budget is required';
			}
			if (!formData.planningPeriod.startDate) {
				newErrors.planningStartDate = 'Planning start date is required';
			}
			if (!formData.planningPeriod.endDate) {
				newErrors.planningEndDate = 'Planning end date is required';
			}
			if (formData.planningPeriod.startDate && formData.planningPeriod.endDate) {
				if (new Date(formData.planningPeriod.startDate) >= new Date(formData.planningPeriod.endDate)) {
					newErrors.planningEndDate = 'End date must be after start date';
				}
			}
		}

		if (step === 3) {
			if (formData.items.length === 0) {
				newErrors.items = 'At least one planning item is required';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleNext = () => {
		if (validateStep(currentStep)) {
			setCurrentStep(prev => Math.min(prev + 1, steps.length));
		}
	};

	const handlePrevious = () => {
		setCurrentStep(prev => Math.max(prev - 1, 1));
	};

	const handleSubmit = async () => {
		if (!validateStep(currentStep)) return;

		setIsSubmitting(true);
		try {
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			console.log('Submitting plan:', formData);
			alert('Procurement plan created successfully!');
			// Navigate back to plans list
			window.location.href = '/plans';
		} catch (error) {
			console.error('Error creating plan:', error);
			alert('Error creating plan. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: formData.currencyCode || 'USD',
			minimumFractionDigits: 0
		}).format(amount || 0);
	};

	const getTotalItemsCost = () => {
		return formData.items.reduce((total, item) => {
			const cost = parseFloat(item.estimatedCost) || 0;
			const quantity = parseFloat(item.quantity) || 1;
			return total + (cost * quantity);
		}, 0);
	};

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
							➕ Create New Procurement Plan
						</h1>
						<p style={{
							margin: 0,
							color: '#6c757d',
							fontSize: '16px'
						}}>
							Step {currentStep} of {steps.length}: {steps.find(s => s.id === currentStep)?.title}
						</p>
					</div>

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

			{/* Progress Steps */}
			<div style={{
				background: '#ffffff',
				borderRadius: '12px',
				padding: '24px',
				marginBottom: '24px',
				border: '1px solid #dee2e6'
			}}>
				<div style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}>
					{steps.map((step, index) => {
						const isActive = step.id === currentStep;
						const isCompleted = step.id < currentStep;

						return (
							<React.Fragment key={step.id}>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										flex: 1
									}}
								>
									<div style={{
										width: '48px',
										height: '48px',
										borderRadius: '50%',
										background: isCompleted ? '#28a745' : isActive ? '#007bff' : '#e9ecef',
										color: isCompleted || isActive ? 'white' : '#6c757d',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: '20px',
										marginBottom: '8px'
									}}>
										{isCompleted ? '✓' : step.icon}
									</div>
									<div style={{
										fontSize: '14px',
										fontWeight: isActive ? '600' : '400',
										color: isActive ? '#007bff' : '#6c757d',
										textAlign: 'center'
									}}>
										{step.title}
									</div>
								</div>
								
								{index < steps.length - 1 && (
									<div style={{
										height: '2px',
										background: step.id < currentStep ? '#28a745' : '#e9ecef',
										flex: '1',
										margin: '0 16px 24px'
									}}></div>
								)}
							</React.Fragment>
						);
					})}
				</div>
			</div>

			{/* Form Content */}
			<div style={{
				background: '#ffffff',
				borderRadius: '12px',
				border: '1px solid #dee2e6',
				minHeight: '600px'
			}}>
				{/* Step 1: Basic Information */}
				{currentStep === 1 && (
					<div style={{ padding: '32px' }}>
						<h2 style={{
							margin: '0 0 24px 0',
							fontSize: '22px',
							fontWeight: '600',
							color: '#2c3e50'
						}}>
							📋 Basic Plan Information
						</h2>

						<div style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
							gap: '20px'
						}}>
							<div>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									Plan Title *
								</label>
								<input
									type="text"
									placeholder="e.g., Infrastructure Development Plan 2025"
									value={formData.title}
									onChange={(e) => handleInputChange('title', e.target.value)}
									style={{
										width: '100%',
										padding: '12px',
										border: `1px solid ${errors.title ? '#dc3545' : '#ced4da'}`,
										borderRadius: '6px',
										fontSize: '14px'
									}}
								/>
								{errors.title && (
									<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
										{errors.title}
									</div>
								)}
							</div>

							<div>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									Category *
								</label>
								<select
									value={formData.category}
									onChange={(e) => handleInputChange('category', e.target.value)}
									style={{
										width: '100%',
										padding: '12px',
										border: `1px solid ${errors.category ? '#dc3545' : '#ced4da'}`,
										borderRadius: '6px',
										fontSize: '14px'
									}}
								>
									<option value="">Select category...</option>
									{categories.map(category => (
										<option key={category} value={category}>{category}</option>
									))}
								</select>
								{errors.category && (
									<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
										{errors.category}
									</div>
								)}
							</div>

							<div>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									Department *
								</label>
								<select
									value={formData.department}
									onChange={(e) => handleInputChange('department', e.target.value)}
									style={{
										width: '100%',
										padding: '12px',
										border: `1px solid ${errors.department ? '#dc3545' : '#ced4da'}`,
										borderRadius: '6px',
										fontSize: '14px'
									}}
								>
									<option value="">Select department...</option>
									{departments.map(dept => (
										<option key={dept} value={dept}>{dept}</option>
									))}
								</select>
								{errors.department && (
									<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
										{errors.department}
									</div>
								)}
							</div>

							<div>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									Planning Year
								</label>
								<input
									type="number"
									min={new Date().getFullYear()}
									max={new Date().getFullYear() + 10}
									value={formData.year}
									onChange={(e) => handleInputChange('year', e.target.value)}
									style={{
										width: '100%',
										padding: '12px',
										border: '1px solid #ced4da',
										borderRadius: '6px',
										fontSize: '14px'
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
									Priority Level
								</label>
								<select
									value={formData.priority}
									onChange={(e) => handleInputChange('priority', e.target.value)}
									style={{
										width: '100%',
										padding: '12px',
										border: '1px solid #ced4da',
										borderRadius: '6px',
										fontSize: '14px'
									}}
								>
									{priorities.map(priority => (
										<option key={priority.value} value={priority.value}>
											{priority.label}
										</option>
									))}
								</select>
							</div>
						</div>

						<div style={{ marginTop: '20px' }}>
							<label style={{
								display: 'block',
								marginBottom: '8px',
								fontWeight: '500',
								color: '#495057'
							}}>
								Plan Description *
							</label>
							<textarea
								placeholder="Describe the purpose, scope, and objectives of this procurement plan..."
								value={formData.description}
								onChange={(e) => handleInputChange('description', e.target.value)}
								rows={4}
								style={{
									width: '100%',
									padding: '12px',
									border: `1px solid ${errors.description ? '#dc3545' : '#ced4da'}`,
									borderRadius: '6px',
									fontSize: '14px',
									resize: 'vertical'
								}}
							/>
							{errors.description && (
								<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
									{errors.description}
								</div>
							)}
						</div>
					</div>
				)}

				{/* Step 2: Budget & Timeline */}
				{currentStep === 2 && (
					<div style={{ padding: '32px' }}>
						<h2 style={{
							margin: '0 0 24px 0',
							fontSize: '22px',
							fontWeight: '600',
							color: '#2c3e50'
						}}>
							💰 Budget & Timeline
						</h2>

						{/* Budget Section */}
						<div style={{ marginBottom: '32px' }}>
							<h3 style={{ marginBottom: '16px', color: '#495057' }}>Budget Information</h3>
							<div style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
								gap: '20px'
							}}>
								<div>
									<label style={{
										display: 'block',
										marginBottom: '8px',
										fontWeight: '500',
										color: '#495057'
									}}>
										Total Budget *
									</label>
									<input
										type="number"
										placeholder="0"
										value={formData.totalBudget}
										onChange={(e) => handleInputChange('totalBudget', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${errors.totalBudget ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
									{errors.totalBudget && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{errors.totalBudget}
										</div>
									)}
								</div>

								<div>
									<label style={{
										display: 'block',
										marginBottom: '8px',
										fontWeight: '500',
										color: '#495057'
									}}>
										Approved Budget
									</label>
									<input
										type="number"
										placeholder="0"
										value={formData.approvedBudget}
										onChange={(e) => handleInputChange('approvedBudget', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
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
										Currency
									</label>
									<select
										value={formData.currencyCode}
										onChange={(e) => handleInputChange('currencyCode', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
										}}
									>
										<option value="USD">USD - US Dollar</option>
										<option value="EUR">EUR - Euro</option>
										<option value="GBP">GBP - British Pound</option>
										<option value="CAD">CAD - Canadian Dollar</option>
										<option value="AUD">AUD - Australian Dollar</option>
									</select>
								</div>

								<div>
									<label style={{
										display: 'block',
										marginBottom: '8px',
										fontWeight: '500',
										color: '#495057'
									}}>
										Budget Source
									</label>
									<input
										type="text"
										placeholder="e.g., Federal Grant, Municipal Budget"
										value={formData.budgetSource}
										onChange={(e) => handleInputChange('budgetSource', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
								</div>
							</div>
						</div>

						{/* Timeline Section */}
						<div style={{ marginBottom: '32px' }}>
							<h3 style={{ marginBottom: '16px', color: '#495057' }}>Timeline</h3>
							<div style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
								gap: '20px'
							}}>
								<div>
									<label style={{
										display: 'block',
										marginBottom: '8px',
										fontWeight: '500',
										color: '#495057'
									}}>
										Planning Start Date *
									</label>
									<input
										type="date"
										value={formData.planningPeriod.startDate}
										onChange={(e) => handleNestedInputChange('planningPeriod', 'startDate', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${errors.planningStartDate ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
									{errors.planningStartDate && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{errors.planningStartDate}
										</div>
									)}
								</div>

								<div>
									<label style={{
										display: 'block',
										marginBottom: '8px',
										fontWeight: '500',
										color: '#495057'
									}}>
										Planning End Date *
									</label>
									<input
										type="date"
										value={formData.planningPeriod.endDate}
										onChange={(e) => handleNestedInputChange('planningPeriod', 'endDate', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${errors.planningEndDate ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
									{errors.planningEndDate && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{errors.planningEndDate}
										</div>
									)}
								</div>

								<div>
									<label style={{
										display: 'block',
										marginBottom: '8px',
										fontWeight: '500',
										color: '#495057'
									}}>
										Implementation Start
									</label>
									<input
										type="date"
										value={formData.implementationPeriod.startDate}
										onChange={(e) => handleNestedInputChange('implementationPeriod', 'startDate', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
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
										Review Frequency
									</label>
									<select
										value={formData.reviewFrequency}
										onChange={(e) => handleInputChange('reviewFrequency', e.target.value)}
										style={{
											width: '100%',
											padding: '12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
										}}
									>
										{reviewFrequencies.map(freq => (
											<option key={freq.value} value={freq.value}>
												{freq.label}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Step 3: Planning Items */}
				{currentStep === 3 && (
					<div style={{ padding: '32px' }}>
						<div style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '24px'
						}}>
							<h2 style={{
								margin: 0,
								fontSize: '22px',
								fontWeight: '600',
								color: '#2c3e50'
							}}>
								📝 Planning Items
							</h2>

							<button
								onClick={addPlanItem}
								style={{
									padding: '12px 20px',
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
								➕ Add Item
							</button>
						</div>

						{errors.items && (
							<div style={{
								background: '#f8d7da',
								color: '#721c24',
								padding: '12px',
								borderRadius: '6px',
								marginBottom: '20px',
								fontSize: '14px'
							}}>
								{errors.items}
							</div>
						)}

						{formData.items.length === 0 ? (
							<div style={{
								textAlign: 'center',
								padding: '60px 20px',
								color: '#6c757d'
							}}>
								<div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
								<p style={{ marginBottom: '16px' }}>No planning items added yet.</p>
								<button
									onClick={addPlanItem}
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
									Add First Item
								</button>
							</div>
						) : (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '20px'
							}}>
								{formData.items.map((item, index) => (
									<div
										key={item.id}
										style={{
											background: '#f8f9fa',
											border: '1px solid #dee2e6',
											borderRadius: '8px',
											padding: '20px'
										}}
									>
										<div style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											marginBottom: '16px'
										}}>
											<h4 style={{
												margin: 0,
												color: '#495057',
												fontSize: '16px',
												fontWeight: '600'
											}}>
												Item #{index + 1}
											</h4>
											<button
												onClick={() => removePlanItem(item.id)}
												style={{
													background: '#dc3545',
													color: 'white',
													border: 'none',
													borderRadius: '4px',
													padding: '6px 12px',
													cursor: 'pointer',
													fontSize: '12px'
												}}
											>
												🗑️ Remove
											</button>
										</div>

										<div style={{
											display: 'grid',
											gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
											gap: '16px'
										}}>
											<div style={{ gridColumn: 'span 2' }}>
												<label style={{
													display: 'block',
													marginBottom: '6px',
													fontWeight: '500',
													fontSize: '14px',
													color: '#495057'
												}}>
													Item Title
												</label>
												<input
													type="text"
													placeholder="e.g., Desktop Computers"
													value={item.title}
													onChange={(e) => updatePlanItem(item.id, 'title', e.target.value)}
													style={{
														width: '100%',
														padding: '10px',
														border: '1px solid #ced4da',
														borderRadius: '4px',
														fontSize: '14px'
													}}
												/>
											</div>

											<div>
												<label style={{
													display: 'block',
													marginBottom: '6px',
													fontWeight: '500',
													fontSize: '14px',
													color: '#495057'
												}}>
													Category
												</label>
												<select
													value={item.category}
													onChange={(e) => updatePlanItem(item.id, 'category', e.target.value)}
													style={{
														width: '100%',
														padding: '10px',
														border: '1px solid #ced4da',
														borderRadius: '4px',
														fontSize: '14px'
													}}
												>
													<option value="">Select...</option>
													{categories.map(cat => (
														<option key={cat} value={cat}>{cat}</option>
													))}
												</select>
											</div>

											<div>
												<label style={{
													display: 'block',
													marginBottom: '6px',
													fontWeight: '500',
													fontSize: '14px',
													color: '#495057'
												}}>
													Estimated Cost
												</label>
												<input
													type="number"
													placeholder="0"
													value={item.estimatedCost}
													onChange={(e) => updatePlanItem(item.id, 'estimatedCost', e.target.value)}
													style={{
														width: '100%',
														padding: '10px',
														border: '1px solid #ced4da',
														borderRadius: '4px',
														fontSize: '14px'
													}}
												/>
											</div>

											<div>
												<label style={{
													display: 'block',
													marginBottom: '6px',
													fontWeight: '500',
													fontSize: '14px',
													color: '#495057'
												}}>
													Quantity
												</label>
												<input
													type="number"
													min="1"
													value={item.quantity}
													onChange={(e) => updatePlanItem(item.id, 'quantity', e.target.value)}
													style={{
														width: '100%',
														padding: '10px',
														border: '1px solid #ced4da',
														borderRadius: '4px',
														fontSize: '14px'
													}}
												/>
											</div>

											<div>
												<label style={{
													display: 'block',
													marginBottom: '6px',
													fontWeight: '500',
													fontSize: '14px',
													color: '#495057'
												}}>
													Unit
												</label>
												<input
													type="text"
													placeholder="e.g., each, kg, m²"
													value={item.unit}
													onChange={(e) => updatePlanItem(item.id, 'unit', e.target.value)}
													style={{
														width: '100%',
														padding: '10px',
														border: '1px solid #ced4da',
														borderRadius: '4px',
														fontSize: '14px'
													}}
												/>
											</div>

											<div>
												<label style={{
													display: 'block',
													marginBottom: '6px',
													fontWeight: '500',
													fontSize: '14px',
													color: '#495057'
												}}>
													Target Date
												</label>
												<input
													type="date"
													value={item.targetDate}
													onChange={(e) => updatePlanItem(item.id, 'targetDate', e.target.value)}
													style={{
														width: '100%',
														padding: '10px',
														border: '1px solid #ced4da',
														borderRadius: '4px',
														fontSize: '14px'
													}}
												/>
											</div>
										</div>

										<div style={{ marginTop: '16px' }}>
											<label style={{
												display: 'block',
												marginBottom: '6px',
												fontWeight: '500',
												fontSize: '14px',
												color: '#495057'
											}}>
												Description & Specifications
											</label>
											<textarea
												placeholder="Detailed description and specifications..."
												value={item.description}
												onChange={(e) => updatePlanItem(item.id, 'description', e.target.value)}
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
									</div>
								))}

								{/* Items Summary */}
								{formData.items.length > 0 && (
									<div style={{
										background: '#e7f3ff',
										border: '1px solid #b3d7ff',
										borderRadius: '8px',
										padding: '16px',
										marginTop: '10px'
									}}>
										<div style={{ color: '#0066cc', fontWeight: '600', marginBottom: '8px' }}>
											Items Summary
										</div>
										<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
											<div style={{ fontSize: '14px', color: '#495057' }}>
												<strong>Total Items:</strong> {formData.items.length}
											</div>
											<div style={{ fontSize: '14px', color: '#495057' }}>
												<strong>Estimated Cost:</strong> {formatCurrency(getTotalItemsCost())}
											</div>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* Step 4: Review & Submit */}
				{currentStep === 4 && (
					<div style={{ padding: '32px' }}>
						<h2 style={{
							margin: '0 0 24px 0',
							fontSize: '22px',
							fontWeight: '600',
							color: '#2c3e50'
						}}>
							✅ Review & Submit
						</h2>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
							{/* Plan Summary */}
							<div style={{
								background: '#f8f9fa',
								border: '1px solid #dee2e6',
								borderRadius: '8px',
								padding: '20px'
							}}>
								<h3 style={{ marginBottom: '16px', color: '#495057' }}>Plan Summary</h3>
								<div style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
									gap: '16px'
								}}>
									<div>
										<strong>Title:</strong> {formData.title || 'Not specified'}
									</div>
									<div>
										<strong>Category:</strong> {formData.category || 'Not specified'}
									</div>
									<div>
										<strong>Department:</strong> {formData.department || 'Not specified'}
									</div>
									<div>
										<strong>Planning Year:</strong> {formData.year}
									</div>
									<div>
										<strong>Priority:</strong> {priorities.find(p => p.value === formData.priority)?.label}
									</div>
									<div>
										<strong>Total Budget:</strong> {formatCurrency(formData.totalBudget)}
									</div>
								</div>
								{formData.description && (
									<div style={{ marginTop: '16px' }}>
										<strong>Description:</strong>
										<p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
											{formData.description}
										</p>
									</div>
								)}
							</div>

							{/* Timeline Summary */}
							<div style={{
								background: '#f8f9fa',
								border: '1px solid #dee2e6',
								borderRadius: '8px',
								padding: '20px'
							}}>
								<h3 style={{ marginBottom: '16px', color: '#495057' }}>Timeline</h3>
								<div style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
									gap: '16px'
								}}>
									<div>
										<strong>Planning Period:</strong><br />
										{formData.planningPeriod.startDate ? new Date(formData.planningPeriod.startDate).toLocaleDateString() : 'Not set'} 
										{formData.planningPeriod.endDate && ` - ${new Date(formData.planningPeriod.endDate).toLocaleDateString()}`}
									</div>
									<div>
										<strong>Review Frequency:</strong> {reviewFrequencies.find(f => f.value === formData.reviewFrequency)?.label}
									</div>
								</div>
							</div>

							{/* Items Summary */}
							<div style={{
								background: '#f8f9fa',
								border: '1px solid #dee2e6',
								borderRadius: '8px',
								padding: '20px'
							}}>
								<h3 style={{ marginBottom: '16px', color: '#495057' }}>Planning Items ({formData.items.length})</h3>
								{formData.items.length > 0 ? (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '12px',
										maxHeight: '300px',
										overflowY: 'auto'
									}}>
										{formData.items.map((item, index) => (
											<div
												key={item.id}
												style={{
													background: '#ffffff',
													border: '1px solid #dee2e6',
													borderRadius: '4px',
													padding: '12px'
												}}
											>
												<div style={{
													display: 'grid',
													gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
													gap: '8px',
													fontSize: '14px'
												}}>
													<div><strong>#{index + 1}:</strong> {item.title || 'Untitled'}</div>
													<div><strong>Qty:</strong> {item.quantity} {item.unit}</div>
													<div><strong>Cost:</strong> {formatCurrency(item.estimatedCost * item.quantity)}</div>
												</div>
											</div>
										))}
										<div style={{
											background: '#e7f3ff',
											border: '1px solid #b3d7ff',
											borderRadius: '4px',
											padding: '12px',
											fontWeight: '600',
											color: '#0066cc'
										}}>
											Total Estimated Cost: {formatCurrency(getTotalItemsCost())}
										</div>
									</div>
								) : (
									<p style={{ color: '#6c757d', margin: 0 }}>No items added yet.</p>
								)}
							</div>

							{/* Confirmation */}
							<div style={{
								background: '#fff3cd',
								border: '1px solid #ffeaa7',
								borderRadius: '8px',
								padding: '16px'
							}}>
								<p style={{ margin: 0, color: '#856404' }}>
									⚠️ <strong>Please review all information carefully.</strong> Once submitted, this plan will be created and may require approval before changes can be made.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Form Actions */}
				<div style={{
					borderTop: '1px solid #dee2e6',
					padding: '24px 32px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}>
					<div>
						{currentStep > 1 && (
							<button
								onClick={handlePrevious}
								disabled={isSubmitting}
								style={{
									padding: '12px 24px',
									background: '#6c757d',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: isSubmitting ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									opacity: isSubmitting ? 0.6 : 1
								}}
							>
								← Previous
							</button>
						)}
					</div>

					<div>
						{currentStep < steps.length ? (
							<button
								onClick={handleNext}
								disabled={isSubmitting}
								style={{
									padding: '12px 24px',
									background: '#007bff',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: isSubmitting ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									opacity: isSubmitting ? 0.6 : 1
								}}
							>
								Next →
							</button>
						) : (
							<button
								onClick={handleSubmit}
								disabled={isSubmitting}
								style={{
									padding: '12px 32px',
									background: isSubmitting ? '#6c757d' : '#28a745',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: isSubmitting ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}
							>
								{isSubmitting ? (
									<>
										<div style={{
											width: '16px',
											height: '16px',
											border: '2px solid #ffffff40',
											borderTop: '2px solid #ffffff',
											borderRadius: '50%',
											animation: 'spin 1s linear infinite'
										}}></div>
										Creating Plan...
									</>
								) : (
									<>✅ Create Plan</>
								)}
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Custom Styles */}
			<style>{`
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	);
}