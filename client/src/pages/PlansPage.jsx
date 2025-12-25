import React, { useState, useEffect } from 'react';

/**
 * Plans Overview Page - Main procurement plans listing and management
 * 
 * Features:
 * - View all procurement plans
 * - Filter and search plans
 * - Plan status tracking
 * - Quick actions
 * - Export functionality
 */

export default function PlansPage() {
	const [plans, setPlans] = useState([]);
	const [filteredPlans, setFilteredPlans] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [categoryFilter, setCategoryFilter] = useState('all');

	// Mock data for development
	const mockPlans = [
		{
			id: 'PLAN-2025-001',
			title: 'Infrastructure Development Plan 2025',
			description: 'Annual infrastructure procurement plan including roads, buildings, and utilities',
			category: 'Infrastructure',
			status: 'active',
			totalBudget: 5000000,
			approvedBudget: 4800000,
			spent: 1200000,
			itemsCount: 15,
			completedItems: 5,
			createdBy: 'John Smith',
			createdAt: '2024-12-01',
			lastModified: '2024-12-20',
			year: '2025',
			department: 'Public Works'
		},
		{
			id: 'PLAN-2025-002',
			title: 'IT Equipment & Services Plan',
			description: 'Technology procurement plan covering hardware, software, and IT services',
			category: 'Technology',
			status: 'draft',
			totalBudget: 750000,
			approvedBudget: 0,
			spent: 0,
			itemsCount: 8,
			completedItems: 0,
			createdBy: 'Sarah Johnson',
			createdAt: '2024-11-15',
			lastModified: '2024-12-18',
			year: '2025',
			department: 'IT Department'
		},
		{
			id: 'PLAN-2025-003',
			title: 'Medical Supplies Annual Plan',
			description: 'Healthcare procurement plan for medical equipment and supplies',
			category: 'Healthcare',
			status: 'under-review',
			totalBudget: 2200000,
			approvedBudget: 2200000,
			spent: 450000,
			itemsCount: 12,
			completedItems: 3,
			createdBy: 'Dr. Michael Chen',
			createdAt: '2024-10-20',
			lastModified: '2024-12-22',
			year: '2025',
			department: 'Health Services'
		}
	];

	// Initialize data
	useEffect(() => {
		const loadPlans = async () => {
			setIsLoading(true);
			try {
				// Simulate API call
				await new Promise(resolve => setTimeout(resolve, 1000));
				setPlans(mockPlans);
				setFilteredPlans(mockPlans);
			} catch (error) {
				console.error('Error loading plans:', error);
			} finally {
				setIsLoading(false);
			}
		};

		loadPlans();
	}, []);

	// Filter plans based on search and filters
	useEffect(() => {
		let filtered = plans;

		// Apply search filter
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filtered = filtered.filter(plan =>
				plan.title.toLowerCase().includes(searchLower) ||
				plan.description.toLowerCase().includes(searchLower) ||
				plan.id.toLowerCase().includes(searchLower) ||
				plan.department.toLowerCase().includes(searchLower)
			);
		}

		// Apply status filter
		if (statusFilter !== 'all') {
			filtered = filtered.filter(plan => plan.status === statusFilter);
		}

		// Apply category filter
		if (categoryFilter !== 'all') {
			filtered = filtered.filter(plan => plan.category === categoryFilter);
		}

		setFilteredPlans(filtered);
	}, [plans, searchTerm, statusFilter, categoryFilter]);

	// Utility functions
	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0
		}).format(amount);
	};

	const getStatusColor = (status) => {
		const colors = {
			'draft': '#6c757d',
			'under-review': '#ffc107',
			'active': '#28a745',
			'completed': '#17a2b8',
			'cancelled': '#dc3545'
		};
		return colors[status] || '#6c757d';
	};

	const getStatusLabel = (status) => {
		const labels = {
			'draft': 'Draft',
			'under-review': 'Under Review',
			'active': 'Active',
			'completed': 'Completed',
			'cancelled': 'Cancelled'
		};
		return labels[status] || status;
	};

	const getProgressPercentage = (completed, total) => {
		return total > 0 ? Math.round((completed / total) * 100) : 0;
	};

	const getBudgetUtilization = (spent, approved) => {
		return approved > 0 ? Math.round((spent / approved) * 100) : 0;
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
							📋 Procurement Plans
						</h1>
						<p style={{
							margin: 0,
							color: '#6c757d',
							fontSize: '16px'
						}}>
							Manage and track all procurement planning activities
						</p>
					</div>

					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<button
							onClick={() => window.location.href = '/plans/import'}
							style={{
								padding: '12px 24px',
								background: '#17a2b8',
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
							📤 Import Excel
						</button>

						<button
							onClick={() => window.location.href = '/plans/new'}
							style={{
								padding: '12px 24px',
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
							➕ Create New Plan
						</button>
					</div>
				</div>
			</div>

			{/* Statistics Cards */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
				gap: '20px',
				marginBottom: '24px'
			}}>
				{[
					{ label: 'Total Plans', value: plans.length, icon: '📋', color: '#007bff' },
					{ label: 'Active Plans', value: plans.filter(p => p.status === 'active').length, icon: '⚡', color: '#28a745' },
					{ label: 'Under Review', value: plans.filter(p => p.status === 'under-review').length, icon: '👁️', color: '#ffc107' },
					{ label: 'Total Budget', value: formatCurrency(plans.reduce((sum, p) => sum + p.totalBudget, 0)), icon: '💰', color: '#17a2b8' }
				].map((stat, index) => (
					<div
						key={index}
						style={{
							background: '#ffffff',
							padding: '24px',
							borderRadius: '12px',
							border: '1px solid #dee2e6',
							boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
						}}
					>
						<div style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: '12px'
						}}>
							<span style={{
								fontSize: '32px',
								color: stat.color
							}}>
								{stat.icon}
							</span>
							<div style={{
								fontSize: '24px',
								fontWeight: '700',
								color: stat.color
							}}>
								{stat.value}
							</div>
						</div>
						<div style={{
							fontSize: '16px',
							fontWeight: '500',
							color: '#495057'
						}}>
							{stat.label}
						</div>
					</div>
				))}
			</div>

			{/* Filters */}
			<div style={{
				background: '#ffffff',
				padding: '20px',
				borderRadius: '12px',
				marginBottom: '20px',
				border: '1px solid #dee2e6'
			}}>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
					gap: '16px'
				}}>
					<div>
						<label style={{
							display: 'block',
							marginBottom: '8px',
							fontWeight: '500',
							color: '#495057'
						}}>
							🔍 Search Plans
						</label>
						<input
							type="text"
							placeholder="Search by title, description, or ID..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							style={{
								width: '100%',
								padding: '10px 12px',
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
							📊 Status
						</label>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							style={{
								width: '100%',
								padding: '10px 12px',
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px'
							}}
						>
							<option value="all">All Statuses</option>
							<option value="draft">Draft</option>
							<option value="under-review">Under Review</option>
							<option value="active">Active</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>

					<div>
						<label style={{
							display: 'block',
							marginBottom: '8px',
							fontWeight: '500',
							color: '#495057'
						}}>
							🏷️ Category
						</label>
						<select
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
							style={{
								width: '100%',
								padding: '10px 12px',
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px'
							}}
						>
							<option value="all">All Categories</option>
							<option value="Infrastructure">Infrastructure</option>
							<option value="Technology">Technology</option>
							<option value="Healthcare">Healthcare</option>
							<option value="Education">Education</option>
							<option value="Transportation">Transportation</option>
						</select>
					</div>
				</div>

				<div style={{
					marginTop: '15px',
					fontSize: '14px',
					color: '#6c757d',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}>
					<span>Showing {filteredPlans.length} of {plans.length} plans</span>
					{(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
						<span style={{ color: '#007bff' }}>🔍 Filters applied</span>
					)}
				</div>
			</div>

			{/* Plans Grid */}
			{isLoading ? (
				<div style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					padding: '60px',
					background: '#fff',
					borderRadius: '12px',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ textAlign: 'center' }}>
						<div style={{
							width: '40px',
							height: '40px',
							border: '3px solid #f3f3f3',
							borderTop: '3px solid #007bff',
							borderRadius: '50%',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 15px'
						}}></div>
						<p style={{ color: '#6c757d', margin: 0 }}>Loading plans...</p>
					</div>
				</div>
			) : filteredPlans.length === 0 ? (
				<div style={{
					padding: '60px',
					textAlign: 'center',
					background: '#ffffff',
					borderRadius: '12px',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
					{plans.length === 0 ? (
						<>
							<h3 style={{ marginBottom: '10px', color: '#495057' }}>No Plans Yet</h3>
							<p style={{ marginBottom: '20px', color: '#6c757d' }}>
								Create your first procurement plan to start managing your procurement activities.
							</p>
							<button
								onClick={() => window.location.href = '/plans/new'}
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
								➕ Create First Plan
							</button>
						</>
					) : (
						<>
							<h3 style={{ marginBottom: '10px', color: '#495057' }}>No Matching Plans</h3>
							<p style={{ marginBottom: '0', color: '#6c757d' }}>
								No plans match your current filters. Try adjusting your search criteria.
							</p>
						</>
					)}
				</div>
			) : (
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
					gap: '24px'
				}}>
					{filteredPlans.map((plan) => {
						const progressPercentage = getProgressPercentage(plan.completedItems, plan.itemsCount);
						const budgetUtilization = getBudgetUtilization(plan.spent, plan.approvedBudget);

						return (
							<div
								key={plan.id}
								style={{
									background: '#ffffff',
									border: '1px solid #dee2e6',
									borderRadius: '12px',
									boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
									overflow: 'hidden',
									transition: 'all 0.2s ease',
									cursor: 'pointer'
								}}
								className="plan-card"
								onClick={() => console.log('Navigate to plan details:', plan.id)}
							>
								{/* Card Header */}
								<div style={{
									padding: '24px',
									borderBottom: '1px solid #f0f0f0'
								}}>
									<div style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'flex-start',
										marginBottom: '12px'
									}}>
										<div style={{ flex: 1 }}>
											<h3 style={{
												margin: '0 0 8px 0',
												fontSize: '18px',
												fontWeight: '600',
												color: '#2c3e50'
											}}>
												{plan.title}
											</h3>
											<div style={{
												fontSize: '14px',
												color: '#6c757d',
												marginBottom: '8px'
											}}>
												{plan.id} • {plan.department}
											</div>
										</div>

										<span style={{
											background: getStatusColor(plan.status) + '20',
											color: getStatusColor(plan.status),
											padding: '4px 10px',
											borderRadius: '12px',
											fontSize: '12px',
											fontWeight: '500'
										}}>
											{getStatusLabel(plan.status)}
										</span>
									</div>

									<p style={{
										margin: '0',
										fontSize: '14px',
										color: '#6c757d',
										lineHeight: '1.4'
									}}>
										{plan.description}
									</p>
								</div>

								{/* Progress and Budget */}
								<div style={{ padding: '20px 24px' }}>
									<div style={{
										display: 'grid',
										gridTemplateColumns: '1fr 1fr',
										gap: '20px'
									}}>
										<div>
											<div style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												marginBottom: '8px'
											}}>
												<span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
													Progress
												</span>
												<span style={{ fontSize: '14px', fontWeight: '600', color: '#007bff' }}>
													{progressPercentage}%
												</span>
											</div>
											<div style={{
												width: '100%',
												height: '6px',
												background: '#e9ecef',
												borderRadius: '3px',
												overflow: 'hidden'
											}}>
												<div style={{
													width: `${progressPercentage}%`,
													height: '100%',
													background: '#007bff',
													transition: 'width 0.3s ease'
												}}></div>
											</div>
											<div style={{
												fontSize: '12px',
												color: '#6c757d',
												marginTop: '4px'
											}}>
												{plan.completedItems} of {plan.itemsCount} items
											</div>
										</div>

										<div>
											<div style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												marginBottom: '8px'
											}}>
												<span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
													Budget Used
												</span>
												<span style={{ fontSize: '14px', fontWeight: '600', color: '#28a745' }}>
													{budgetUtilization}%
												</span>
											</div>
											<div style={{
												width: '100%',
												height: '6px',
												background: '#e9ecef',
												borderRadius: '3px',
												overflow: 'hidden'
											}}>
												<div style={{
													width: `${budgetUtilization}%`,
													height: '100%',
													background: '#28a745',
													transition: 'width 0.3s ease'
												}}></div>
											</div>
											<div style={{
												fontSize: '12px',
												color: '#6c757d',
												marginTop: '4px'
											}}>
												{formatCurrency(plan.spent)} of {formatCurrency(plan.approvedBudget)}
											</div>
										</div>
									</div>
								</div>

								{/* Card Footer */}
								<div style={{
									padding: '16px 24px',
									background: '#f8f9fa',
									borderTop: '1px solid #f0f0f0',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center'
								}}>
									<div style={{ fontSize: '12px', color: '#6c757d' }}>
										Created: {new Date(plan.createdAt).toLocaleDateString()}
									</div>
									<div style={{ display: 'flex', gap: '8px' }}>
										<button
											onClick={(e) => {
												e.stopPropagation();
												console.log('Edit plan:', plan.id);
											}}
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
											✏️ Edit
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation();
												console.log('View plan details:', plan.id);
											}}
											style={{
												padding: '6px 12px',
												background: '#17a2b8',
												color: 'white',
												border: 'none',
												borderRadius: '4px',
												cursor: 'pointer',
												fontSize: '12px'
											}}
										>
											👁️ View
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Custom Styles */}
			<style>{`
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
				
				.plan-card:hover {
					transform: translateY(-2px);
					box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
				}
			`}</style>
		</div>
	);
}