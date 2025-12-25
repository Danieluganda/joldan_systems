import React, { useState, useEffect } from 'react';

/**
 * Workplans Page - Project workplan management and scheduling interface
 * 
 * Features:
 * - Procurement workplan creation and management
 * - Project timeline visualization
 * - Task scheduling and dependencies
 * - Resource allocation planning
 * - Progress tracking and monitoring
 * - Gantt chart visualization
 */

export default function WorkplansPage() {
	const [activeTab, setActiveTab] = useState('workplans');
	const [workplans, setWorkplans] = useState([]);
	const [selectedWorkplan, setSelectedWorkplan] = useState(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [loading, setLoading] = useState(true);

	const tabs = [
		{ id: 'workplans', name: 'All Workplans', icon: '📊' },
		{ id: 'templates', name: 'Templates', icon: '📄' },
		{ id: 'calendar', name: 'Calendar View', icon: '📅' },
		{ id: 'analytics', name: 'Analytics', icon: '📈' }
	];

	// Mock workplans data
	const mockWorkplans = [
		{
			id: 'WP-001',
			name: 'IT Infrastructure Procurement',
			description: 'Complete workplan for IT infrastructure procurement project',
			status: 'active',
			progress: 65,
			startDate: '2024-01-15',
			endDate: '2024-06-30',
			manager: 'Sarah Johnson',
			department: 'IT Department',
			budget: 850000,
			tasksTotal: 24,
			tasksCompleted: 16,
			tasksInProgress: 5,
			tasksPending: 3,
			milestones: [
				{ id: 1, name: 'Project Initiation', date: '2024-01-15', status: 'completed' },
				{ id: 2, name: 'Requirements Analysis', date: '2024-02-15', status: 'completed' },
				{ id: 3, name: 'Vendor Selection', date: '2024-03-30', status: 'completed' },
				{ id: 4, name: 'Contract Award', date: '2024-05-15', status: 'in-progress' },
				{ id: 5, name: 'Implementation', date: '2024-06-30', status: 'pending' }
			],
			tasks: [
				{ id: 1, name: 'Define Requirements', status: 'completed', progress: 100, startDate: '2024-01-15', endDate: '2024-01-30', assignee: 'John Smith' },
				{ id: 2, name: 'Market Research', status: 'completed', progress: 100, startDate: '2024-02-01', endDate: '2024-02-14', assignee: 'Emily Davis' },
				{ id: 3, name: 'RFQ Preparation', status: 'in-progress', progress: 75, startDate: '2024-02-15', endDate: '2024-03-01', assignee: 'Mike Wilson' },
				{ id: 4, name: 'Vendor Evaluation', status: 'pending', progress: 0, startDate: '2024-03-05', endDate: '2024-03-25', assignee: 'Lisa Brown' }
			],
			createdBy: 'Project Manager',
			createdAt: '2024-01-10',
			lastModified: '2024-12-20'
		},
		{
			id: 'WP-002',
			name: 'Office Equipment Renewal',
			description: 'Annual office equipment replacement and upgrade program',
			status: 'planning',
			progress: 25,
			startDate: '2024-03-01',
			endDate: '2024-08-31',
			manager: 'David Chen',
			department: 'Administration',
			budget: 450000,
			tasksTotal: 18,
			tasksCompleted: 3,
			tasksInProgress: 2,
			tasksPending: 13,
			milestones: [
				{ id: 1, name: 'Budget Approval', date: '2024-02-15', status: 'completed' },
				{ id: 2, name: 'Equipment Assessment', date: '2024-03-15', status: 'in-progress' },
				{ id: 3, name: 'Procurement Process', date: '2024-05-01', status: 'pending' },
				{ id: 4, name: 'Installation', date: '2024-07-15', status: 'pending' },
				{ id: 5, name: 'Project Closure', date: '2024-08-31', status: 'pending' }
			],
			tasks: [
				{ id: 1, name: 'Current Equipment Audit', status: 'completed', progress: 100, startDate: '2024-02-01', endDate: '2024-02-28', assignee: 'Anna Lee' },
				{ id: 2, name: 'Requirements Gathering', status: 'in-progress', progress: 60, startDate: '2024-03-01', endDate: '2024-03-20', assignee: 'Tom Zhang' },
				{ id: 3, name: 'Budget Planning', status: 'pending', progress: 0, startDate: '2024-03-21', endDate: '2024-04-10', assignee: 'Rachel Green' }
			],
			createdBy: 'Admin Manager',
			createdAt: '2024-01-25',
			lastModified: '2024-12-18'
		},
		{
			id: 'WP-003',
			name: 'Consulting Services Procurement',
			description: 'Strategic consulting services for digital transformation',
			status: 'completed',
			progress: 100,
			startDate: '2023-09-01',
			endDate: '2024-02-29',
			manager: 'Maria Rodriguez',
			department: 'Strategy',
			budget: 1200000,
			tasksTotal: 32,
			tasksCompleted: 32,
			tasksInProgress: 0,
			tasksPending: 0,
			milestones: [
				{ id: 1, name: 'Project Planning', date: '2023-09-15', status: 'completed' },
				{ id: 2, name: 'RFP Development', date: '2023-10-31', status: 'completed' },
				{ id: 3, name: 'Vendor Selection', date: '2023-12-15', status: 'completed' },
				{ id: 4, name: 'Contract Execution', date: '2024-01-31', status: 'completed' },
				{ id: 5, name: 'Project Completion', date: '2024-02-29', status: 'completed' }
			],
			tasks: [
				{ id: 1, name: 'Stakeholder Alignment', status: 'completed', progress: 100, startDate: '2023-09-01', endDate: '2023-09-15', assignee: 'Kevin Park' },
				{ id: 2, name: 'SOW Development', status: 'completed', progress: 100, startDate: '2023-09-16', endDate: '2023-10-15', assignee: 'Jennifer Liu' },
				{ id: 3, name: 'Proposal Evaluation', status: 'completed', progress: 100, startDate: '2023-11-01', endDate: '2023-11-30', assignee: 'Robert Kim' }
			],
			createdBy: 'Strategy Lead',
			createdAt: '2023-08-20',
			lastModified: '2024-03-01'
		}
	];

	useEffect(() => {
		// Simulate loading workplans
		setTimeout(() => {
			setWorkplans(mockWorkplans);
			setSelectedWorkplan(mockWorkplans[0]);
			setLoading(false);
		}, 1000);
	}, []);

	const getStatusColor = (status) => {
		switch(status) {
			case 'active': return '#28a745';
			case 'planning': return '#ffc107';
			case 'completed': return '#007bff';
			case 'on-hold': return '#dc3545';
			default: return '#6c757d';
		}
	};

	const getProgressColor = (progress) => {
		if (progress >= 80) return '#28a745';
		if (progress >= 50) return '#ffc107';
		return '#dc3545';
	};

	const getMilestoneStatusColor = (status) => {
		switch(status) {
			case 'completed': return '#28a745';
			case 'in-progress': return '#007bff';
			case 'pending': return '#6c757d';
			case 'overdue': return '#dc3545';
			default: return '#6c757d';
		}
	};

	const handleCreateWorkplan = () => {
		setShowCreateModal(true);
	};

	const renderWorkplansTab = () => (
		<div style={{ padding: '24px' }}>
			{/* Workplan Grid */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
				gap: '20px',
				marginBottom: '24px'
			}}>
				{workplans.map(workplan => (
					<div
						key={workplan.id}
						style={{
							background: '#ffffff',
							border: '1px solid #dee2e6',
							borderRadius: '12px',
							padding: '20px',
							cursor: 'pointer',
							transition: 'all 0.2s ease',
							boxShadow: selectedWorkplan?.id === workplan.id ? '0 4px 12px rgba(0,123,255,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
						}}
						onClick={() => setSelectedWorkplan(workplan)}
					>
						<div style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							marginBottom: '12px'
						}}>
							<div>
								<h4 style={{ margin: '0 0 4px 0', color: '#2c3e50' }}>{workplan.name}</h4>
								<p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>{workplan.id}</p>
							</div>
							<span style={{
								background: getStatusColor(workplan.status),
								color: 'white',
								padding: '4px 12px',
								borderRadius: '16px',
								fontSize: '11px',
								fontWeight: '600'
							}}>
								{workplan.status.toUpperCase()}
							</span>
						</div>

						<p style={{
							margin: '8px 0 16px 0',
							color: '#6c757d',
							fontSize: '14px',
							lineHeight: '1.4'
						}}>
							{workplan.description}
						</p>

						{/* Progress Bar */}
						<div style={{ marginBottom: '16px' }}>
							<div style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '4px'
							}}>
								<span style={{ fontSize: '12px', color: '#6c757d' }}>Progress</span>
								<span style={{ fontSize: '12px', fontWeight: '600', color: getProgressColor(workplan.progress) }}>
									{workplan.progress}%
								</span>
							</div>
							<div style={{
								width: '100%',
								height: '6px',
								background: '#f0f0f0',
								borderRadius: '3px',
								overflow: 'hidden'
							}}>
								<div style={{
									width: `${workplan.progress}%`,
									height: '100%',
									background: getProgressColor(workplan.progress),
									transition: 'width 0.3s ease'
								}} />
							</div>
						</div>

						{/* Stats Grid */}
						<div style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '12px',
							marginBottom: '16px'
						}}>
							<div>
								<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '2px' }}>Manager</div>
								<div style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>{workplan.manager}</div>
							</div>
							<div>
								<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '2px' }}>Budget</div>
								<div style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>
									${workplan.budget.toLocaleString()}
								</div>
							</div>
							<div>
								<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '2px' }}>Duration</div>
								<div style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>
									{workplan.startDate} - {workplan.endDate}
								</div>
							</div>
							<div>
								<div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '2px' }}>Tasks</div>
								<div style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>
									{workplan.tasksCompleted}/{workplan.tasksTotal}
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div style={{ display: 'flex', gap: '8px' }}>
							<button
								onClick={(e) => {
									e.stopPropagation();
									// Would open workplan editor
								}}
								style={{
									flex: 1,
									padding: '8px 12px',
									background: '#007bff',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '12px',
									fontWeight: '500'
								}}
							>
								View Details
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									// Would duplicate workplan
								}}
								style={{
									padding: '8px 12px',
									background: '#28a745',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '12px',
									fontWeight: '500'
								}}
							>
								Duplicate
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Selected Workplan Details */}
			{selectedWorkplan && (
				<div style={{
					background: '#f8f9fa',
					border: '1px solid #dee2e6',
					borderRadius: '12px',
					padding: '24px'
				}}>
					<h4 style={{ marginBottom: '20px', color: '#2c3e50' }}>
						Workplan Details: {selectedWorkplan.name}
					</h4>

					{/* Milestones */}
					<div style={{ marginBottom: '24px' }}>
						<h5 style={{ marginBottom: '16px', color: '#495057' }}>Project Milestones</h5>
						<div style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
							gap: '12px'
						}}>
							{selectedWorkplan.milestones.map(milestone => (
								<div
									key={milestone.id}
									style={{
										background: '#ffffff',
										border: '1px solid #dee2e6',
										borderRadius: '8px',
										padding: '16px'
									}}
								>
									<div style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginBottom: '8px'
									}}>
										<h6 style={{ margin: 0, color: '#495057', fontSize: '13px' }}>
											{milestone.name}
										</h6>
										<span style={{
											background: getMilestoneStatusColor(milestone.status),
											color: 'white',
											padding: '2px 8px',
											borderRadius: '12px',
											fontSize: '10px',
											fontWeight: '600'
										}}>
											{milestone.status.toUpperCase()}
										</span>
									</div>
									<div style={{ fontSize: '12px', color: '#6c757d' }}>
										{milestone.date}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Task Summary */}
					<div>
						<h5 style={{ marginBottom: '16px', color: '#495057' }}>Recent Tasks</h5>
						<div style={{
							background: '#ffffff',
							border: '1px solid #dee2e6',
							borderRadius: '8px',
							overflow: 'hidden'
						}}>
							{selectedWorkplan.tasks.slice(0, 4).map((task, index) => (
								<div
									key={task.id}
									style={{
										display: 'grid',
										gridTemplateColumns: '1fr 100px 120px 100px',
										alignItems: 'center',
										padding: '12px 16px',
										borderBottom: index < selectedWorkplan.tasks.length - 1 ? '1px solid #f0f0f0' : 'none',
										gap: '16px'
									}}
								>
									<div>
										<div style={{ fontWeight: '500', color: '#495057', fontSize: '13px' }}>
											{task.name}
										</div>
										<div style={{ fontSize: '11px', color: '#6c757d' }}>
											{task.assignee}
										</div>
									</div>
									
									<div style={{ textAlign: 'center' }}>
										<div style={{
											background: getStatusColor(task.status),
											color: 'white',
											padding: '2px 8px',
											borderRadius: '12px',
											fontSize: '10px',
											fontWeight: '600'
										}}>
											{task.status.toUpperCase()}
										</div>
									</div>
									
									<div style={{ textAlign: 'center' }}>
										<div style={{ fontSize: '12px', color: '#6c757d' }}>
											{task.startDate} - {task.endDate}
										</div>
									</div>
									
									<div style={{ textAlign: 'center' }}>
										<div style={{
											fontSize: '13px',
											fontWeight: '600',
											color: getProgressColor(task.progress)
										}}>
											{task.progress}%
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);

	const renderTemplatesTab = () => (
		<div style={{
			padding: '40px',
			textAlign: 'center',
			color: '#6c757d'
		}}>
			<h3>Workplan Templates</h3>
			<p>Pre-built workplan templates and customizable project frameworks coming soon...</p>
		</div>
	);

	const renderCalendarTab = () => (
		<div style={{
			padding: '40px',
			textAlign: 'center',
			color: '#6c757d'
		}}>
			<h3>Calendar View</h3>
			<p>Interactive calendar with timeline visualization and scheduling tools coming soon...</p>
		</div>
	);

	const renderAnalyticsTab = () => (
		<div style={{
			padding: '40px',
			textAlign: 'center',
			color: '#6c757d'
		}}>
			<h3>Workplan Analytics</h3>
			<p>Comprehensive analytics dashboard with performance metrics and insights coming soon...</p>
		</div>
	);

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
				Loading workplans...
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
							📊 Procurement Workplans
						</h1>
						<p style={{
							margin: 0,
							color: '#6c757d',
							fontSize: '16px'
						}}>
							Manage project workplans, timelines, and resource allocation for procurement activities
						</p>
					</div>

					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<button
							onClick={handleCreateWorkplan}
							style={{
								padding: '12px 24px',
								background: '#28a745',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: '500'
							}}
						>
							+ Create Workplan
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
						{workplans.length}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Total Workplans
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
						{workplans.filter(w => w.status === 'active').length}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Active Projects
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
						{workplans.reduce((sum, w) => sum + w.tasksTotal, 0)}
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Total Tasks
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
						{Math.round(workplans.reduce((sum, w) => sum + w.progress, 0) / workplans.length)}%
					</div>
					<div style={{ fontSize: '14px', color: '#6c757d' }}>
						Avg Progress
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
					{activeTab === 'workplans' && renderWorkplansTab()}
					{activeTab === 'templates' && renderTemplatesTab()}
					{activeTab === 'calendar' && renderCalendarTab()}
					{activeTab === 'analytics' && renderAnalyticsTab()}
				</div>
			</div>

			{/* Create Workplan Modal */}
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
							Create New Workplan
						</h3>
						<p style={{ marginBottom: '24px', color: '#6c757d' }}>
							Choose how you'd like to create your project workplan:
						</p>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							<button
								onClick={() => {
									setShowCreateModal(false);
									// Would navigate to workplan creation form
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
								📊 Create from Scratch
								<div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
									Build a new workplan with custom tasks and milestones
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
								📄 Use Template
								<div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
									Start with a pre-built workplan template
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