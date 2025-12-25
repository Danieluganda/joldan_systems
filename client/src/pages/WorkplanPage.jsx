// WorkplanPage.jsx
import React, { useState, useEffect, useCallback } from 'react';

const WorkplanPage = () => {
	// State Management
	const [workplans, setWorkplans] = useState([]);
	const [filteredWorkplans, setFilteredWorkplans] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	// Search and Filter State
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [priorityFilter, setPriorityFilter] = useState('');
	const [departmentFilter, setDepartmentFilter] = useState('');

	// Modal State
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
	const [selectedWorkplan, setSelectedWorkplan] = useState(null);

	// Form State
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		department: '',
		priority: 'medium',
		startDate: '',
		endDate: '',
		status: 'planning',
		budget: '',
		manager: '',
		team: []
	});
	const [formErrors, setFormErrors] = useState({});

	// Task Management State
	const [tasks, setTasks] = useState([]);
	const [taskFormData, setTaskFormData] = useState({
		title: '',
		description: '',
		assignee: '',
		dueDate: '',
		priority: 'medium',
		status: 'todo',
		estimatedHours: ''
	});

	// Utility Functions
	const showSuccessMessage = useCallback((message) => {
		setSuccessMessage(message);
		setTimeout(() => setSuccessMessage(''), 4000);
	}, []);

	const showErrorMessage = useCallback((message) => {
		setError(message);
		setTimeout(() => setError(''), 5000);
	}, []);

	const generateMockWorkplans = () => {
		const departments = ['Procurement', 'Legal', 'Finance', 'IT', 'HR', 'Operations'];
		const priorities = ['low', 'medium', 'high', 'critical'];
		const statuses = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
		const managers = ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Davis', 'Robert Brown'];

		return Array.from({ length: 12 }, (_, index) => {
			const startDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
			const endDate = new Date(startDate.getTime() + (Math.random() * 180 + 30) * 24 * 60 * 60 * 1000);
			const status = statuses[Math.floor(Math.random() * statuses.length)];
			
			return {
				id: `WP-${String(index + 1).padStart(3, '0')}`,
				title: [
					'ERP System Implementation',
					'Office Renovation Project',
					'Vendor Management System',
					'Security Audit Initiative',
					'Staff Training Program',
					'Digital Transformation',
					'Compliance Review Process',
					'Fleet Management Upgrade',
					'Document Management System',
					'Budget Planning Review',
					'Quality Assurance Program',
					'Risk Assessment Project'
				][index],
				description: `Comprehensive ${departments[Math.floor(Math.random() * departments.length)].toLowerCase()} workplan covering multiple phases and deliverables with cross-functional team collaboration.`,
				department: departments[Math.floor(Math.random() * departments.length)],
				priority: priorities[Math.floor(Math.random() * priorities.length)],
				status: status,
				startDate: startDate.toISOString().split('T')[0],
				endDate: endDate.toISOString().split('T')[0],
				budget: (Math.random() * 500000 + 10000).toFixed(0),
				manager: managers[Math.floor(Math.random() * managers.length)],
				team: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, i) => 
					`Member ${i + 1}`
				),
				progress: status === 'completed' ? 100 : 
						status === 'active' ? Math.floor(Math.random() * 70) + 15 :
						status === 'planning' ? Math.floor(Math.random() * 10) : 0,
				tasksCount: Math.floor(Math.random() * 20) + 5,
				completedTasks: 0,
				createdAt: new Date(startDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				updatedAt: new Date().toISOString()
			};
		}).map(wp => ({
			...wp,
			completedTasks: Math.floor(wp.tasksCount * (wp.progress / 100))
		}));
	};

	const generateMockTasks = (workplanId) => {
		const taskTitles = [
			'Requirements Gathering', 'Stakeholder Analysis', 'Budget Approval',
			'Vendor Selection', 'Contract Negotiation', 'System Design',
			'Implementation Planning', 'Testing Phase', 'User Training',
			'Go-Live Preparation', 'Documentation', 'Quality Review',
			'Risk Assessment', 'Performance Monitoring', 'Final Review'
		];
		const assignees = ['Alice Cooper', 'Bob Johnson', 'Carol Smith', 'David Wilson', 'Eve Brown'];
		const priorities = ['low', 'medium', 'high'];
		const statuses = ['todo', 'in-progress', 'review', 'completed'];

		return Array.from({ length: Math.floor(Math.random() * 15) + 8 }, (_, index) => ({
			id: `TASK-${workplanId}-${String(index + 1).padStart(3, '0')}`,
			title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
			description: `Detailed task description covering the scope, deliverables, and success criteria for this task.`,
			assignee: assignees[Math.floor(Math.random() * assignees.length)],
			dueDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
			priority: priorities[Math.floor(Math.random() * priorities.length)],
			status: statuses[Math.floor(Math.random() * statuses.length)],
			estimatedHours: Math.floor(Math.random() * 40) + 4,
			actualHours: Math.floor(Math.random() * 30),
			workplanId: workplanId,
			createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
			updatedAt: new Date().toISOString()
		}));
	};

	// Validation Functions
	const validateWorkplanForm = (data) => {
		const errors = {};

		if (!data.title.trim()) {
			errors.title = 'Workplan title is required';
		} else if (data.title.length < 3) {
			errors.title = 'Workplan title must be at least 3 characters';
		}

		if (!data.department.trim()) {
			errors.department = 'Department is required';
		}

		if (!data.startDate) {
			errors.startDate = 'Start date is required';
		}

		if (!data.endDate) {
			errors.endDate = 'End date is required';
		} else if (data.startDate && new Date(data.endDate) <= new Date(data.startDate)) {
			errors.endDate = 'End date must be after start date';
		}

		if (!data.manager.trim()) {
			errors.manager = 'Project manager is required';
		}

		if (data.budget && (isNaN(data.budget) || parseFloat(data.budget) < 0)) {
			errors.budget = 'Budget must be a positive number';
		}

		return errors;
	};

	const validateTaskForm = (data) => {
		const errors = {};

		if (!data.title.trim()) {
			errors.title = 'Task title is required';
		}

		if (!data.assignee.trim()) {
			errors.assignee = 'Assignee is required';
		}

		if (!data.dueDate) {
			errors.dueDate = 'Due date is required';
		}

		if (data.estimatedHours && (isNaN(data.estimatedHours) || parseInt(data.estimatedHours) < 1)) {
			errors.estimatedHours = 'Estimated hours must be a positive number';
		}

		return errors;
	};

	// API Functions (with fallback to mock data)
	const fetchWorkplans = useCallback(async () => {
		try {
			setIsLoading(true);
			setError('');

			// Simulate API call delay
			await new Promise(resolve => setTimeout(resolve, 800));

			// Try to fetch from API, fallback to mock data
			try {
				const response = await fetch('/api/workplans');
				if (response.ok) {
					const data = await response.json();
					setWorkplans(data);
				} else {
					throw new Error('API not available');
				}
			} catch (apiError) {
				// Fallback to mock data
				const mockData = generateMockWorkplans();
				setWorkplans(mockData);
				console.log('Using mock workplan data:', mockData.length, 'workplans');
			}
		} catch (error) {
			console.error('Error fetching workplans:', error);
			showErrorMessage('Failed to load workplans. Please try again.');
		} finally {
			setIsLoading(false);
		}
	}, [showErrorMessage]);

	const fetchTasks = useCallback(async (workplanId) => {
		try {
			// Try to fetch from API, fallback to mock data
			try {
				const response = await fetch(`/api/workplans/${workplanId}/tasks`);
				if (response.ok) {
					const data = await response.json();
					setTasks(data);
				} else {
					throw new Error('API not available');
				}
			} catch (apiError) {
				// Fallback to mock data
				const mockTasks = generateMockTasks(workplanId);
				setTasks(mockTasks);
				console.log('Using mock task data for workplan:', workplanId);
			}
		} catch (error) {
			console.error('Error fetching tasks:', error);
			showErrorMessage('Failed to load tasks. Please try again.');
		}
	}, [showErrorMessage]);

	const saveWorkplan = async (workplanData) => {
		try {
			const method = isEditModalOpen ? 'PUT' : 'POST';
			const url = isEditModalOpen ? `/api/workplans/${selectedWorkplan.id}` : '/api/workplans';
			
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 1000));

			try {
				const response = await fetch(url, {
					method,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(workplanData)
				});

				if (response.ok) {
					const savedWorkplan = await response.json();
					if (isEditModalOpen) {
						setWorkplans(prev => prev.map(wp => wp.id === savedWorkplan.id ? savedWorkplan : wp));
						showSuccessMessage('Workplan updated successfully!');
					} else {
						setWorkplans(prev => [savedWorkplan, ...prev]);
						showSuccessMessage('Workplan created successfully!');
					}
				} else {
					throw new Error('API not available');
				}
			} catch (apiError) {
				// Fallback: simulate successful save
				const savedWorkplan = {
					...workplanData,
					id: isEditModalOpen ? selectedWorkplan.id : `WP-${Date.now()}`,
					progress: 0,
					tasksCount: 0,
					completedTasks: 0,
					createdAt: isEditModalOpen ? selectedWorkplan.createdAt : new Date().toISOString(),
					updatedAt: new Date().toISOString()
				};

				if (isEditModalOpen) {
					setWorkplans(prev => prev.map(wp => wp.id === selectedWorkplan.id ? savedWorkplan : wp));
					showSuccessMessage('Workplan updated successfully!');
				} else {
					setWorkplans(prev => [savedWorkplan, ...prev]);
					showSuccessMessage('Workplan created successfully!');
				}
			}

			return true;
		} catch (error) {
			console.error('Error saving workplan:', error);
			showErrorMessage('Failed to save workplan. Please try again.');
			return false;
		}
	};

	// Event Handlers
	const handleCreateWorkplan = () => {
		setFormData({
			title: '',
			description: '',
			department: '',
			priority: 'medium',
			startDate: '',
			endDate: '',
			status: 'planning',
			budget: '',
			manager: '',
			team: []
		});
		setFormErrors({});
		setIsCreateModalOpen(true);
	};

	const handleEditWorkplan = (workplan) => {
		setSelectedWorkplan(workplan);
		setFormData({
			title: workplan.title,
			description: workplan.description,
			department: workplan.department,
			priority: workplan.priority,
			startDate: workplan.startDate,
			endDate: workplan.endDate,
			status: workplan.status,
			budget: workplan.budget,
			manager: workplan.manager,
			team: workplan.team || []
		});
		setFormErrors({});
		setIsEditModalOpen(true);
	};

	const handleViewWorkplan = async (workplan) => {
		setSelectedWorkplan(workplan);
		setIsViewModalOpen(true);
		await fetchTasks(workplan.id);
	};

	const handleManageTasks = async (workplan) => {
		setSelectedWorkplan(workplan);
		setIsTaskModalOpen(true);
		await fetchTasks(workplan.id);
	};

	const handleDeleteWorkplan = async (workplanId) => {
		if (!window.confirm('Are you sure you want to delete this workplan? This action cannot be undone.')) {
			return;
		}

		try {
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 500));

			setWorkplans(prev => prev.filter(wp => wp.id !== workplanId));
			showSuccessMessage('Workplan deleted successfully!');
		} catch (error) {
			console.error('Error deleting workplan:', error);
			showErrorMessage('Failed to delete workplan. Please try again.');
		}
	};

	const handleFormSubmit = async (e) => {
		e.preventDefault();
		
		const errors = validateWorkplanForm(formData);
		if (Object.keys(errors).length > 0) {
			setFormErrors(errors);
			return;
		}

		setIsLoading(true);
		const success = await saveWorkplan(formData);
		
		if (success) {
			closeModals();
		}
		
		setIsLoading(false);
	};

	const closeModals = () => {
		setIsCreateModalOpen(false);
		setIsEditModalOpen(false);
		setIsViewModalOpen(false);
		setIsTaskModalOpen(false);
		setSelectedWorkplan(null);
		setFormData({
			title: '',
			description: '',
			department: '',
			priority: 'medium',
			startDate: '',
			endDate: '',
			status: 'planning',
			budget: '',
			manager: '',
			team: []
		});
		setFormErrors({});
		setTasks([]);
	};

	// Helper Functions
	const getPriorityInfo = (priority) => {
		const priorityMap = {
			low: { color: '#28a745', bg: '#d4edda', label: 'Low', icon: '⬇️' },
			medium: { color: '#ffc107', bg: '#fff3cd', label: 'Medium', icon: '➡️' },
			high: { color: '#fd7e14', bg: '#ffe8d1', label: 'High', icon: '⬆️' },
			critical: { color: '#dc3545', bg: '#f8d7da', label: 'Critical', icon: '🚨' }
		};
		return priorityMap[priority] || priorityMap.medium;
	};

	const getStatusInfo = (status) => {
		const statusMap = {
			planning: { color: '#6f42c1', bg: '#e2d9f3', label: 'Planning', icon: '📋' },
			active: { color: '#007bff', bg: '#cce7ff', label: 'Active', icon: '🟢' },
			'on-hold': { color: '#ffc107', bg: '#fff3cd', label: 'On Hold', icon: '⏸️' },
			completed: { color: '#28a745', bg: '#d4edda', label: 'Completed', icon: '✅' },
			cancelled: { color: '#dc3545', bg: '#f8d7da', label: 'Cancelled', icon: '❌' }
		};
		return statusMap[status] || statusMap.planning;
	};

	const getProgressColor = (progress) => {
		if (progress >= 90) return '#28a745';
		if (progress >= 70) return '#17a2b8';
		if (progress >= 40) return '#ffc107';
		return '#dc3545';
	};

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0
		}).format(amount);
	};

	const calculateDaysRemaining = (endDate) => {
		const end = new Date(endDate);
		const now = new Date();
		const diffTime = end - now;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	};

	// Filter workplans based on search and filters
	useEffect(() => {
		let filtered = workplans;

		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filtered = filtered.filter(workplan =>
				workplan.title.toLowerCase().includes(searchLower) ||
				workplan.description.toLowerCase().includes(searchLower) ||
				workplan.manager.toLowerCase().includes(searchLower) ||
				workplan.id.toLowerCase().includes(searchLower)
			);
		}

		if (statusFilter) {
			filtered = filtered.filter(workplan => workplan.status === statusFilter);
		}

		if (priorityFilter) {
			filtered = filtered.filter(workplan => workplan.priority === priorityFilter);
		}

		if (departmentFilter) {
			filtered = filtered.filter(workplan => workplan.department === departmentFilter);
		}

		setFilteredWorkplans(filtered);
	}, [workplans, searchTerm, statusFilter, priorityFilter, departmentFilter]);

	// Load workplans on component mount
	useEffect(() => {
		fetchWorkplans();
	}, [fetchWorkplans]);

	// Get unique departments for filter dropdown
	const uniqueDepartments = [...new Set(workplans.map(wp => wp.department))].sort();

	// Calculate summary statistics
	const stats = {
		total: workplans.length,
		active: workplans.filter(wp => wp.status === 'active').length,
		completed: workplans.filter(wp => wp.status === 'completed').length,
		onHold: workplans.filter(wp => wp.status === 'on-hold').length,
		overdue: workplans.filter(wp => {
			const daysRemaining = calculateDaysRemaining(wp.endDate);
			return daysRemaining < 0 && wp.status !== 'completed' && wp.status !== 'cancelled';
		}).length
	};

	return (
		<div style={{ 
			padding: '24px',
			background: '#f8f9fa',
			minHeight: '100vh',
			fontFamily: 'system-ui, -apple-system, sans-serif'
		}}>
			{/* Page Header */}
			<div style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				marginBottom: '30px',
				flexWrap: 'wrap',
				gap: '15px'
			}}>
				<div>
					<h1 style={{ 
						margin: '0 0 8px 0',
						fontSize: '28px',
						fontWeight: '700',
						color: '#2c3e50'
					}}>
						Project Workplans
					</h1>
					<p style={{ 
						margin: 0,
						color: '#6c757d',
						fontSize: '16px'
					}}>
						Manage and track procurement project workplans and timelines
					</p>
				</div>

				<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
					<button
						onClick={() => fetchWorkplans()}
						disabled={isLoading}
						style={{
							padding: '10px 16px',
							background: '#17a2b8',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: isLoading ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							opacity: isLoading ? 0.6 : 1
						}}
					>
						🔄 {isLoading ? 'Loading...' : 'Refresh'}
					</button>

					<button
						onClick={handleCreateWorkplan}
						style={{
							padding: '10px 20px',
							background: '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '600'
						}}
					>
						➕ Create Workplan
					</button>
				</div>
			</div>

			{/* Success/Error Messages */}
			{successMessage && (
				<div style={{
					background: '#d4edda',
					color: '#155724',
					padding: '12px 16px',
					borderRadius: '6px',
					marginBottom: '20px',
					border: '1px solid #c3e6cb',
					display: 'flex',
					alignItems: 'center',
					gap: '8px'
				}}>
					✅ {successMessage}
				</div>
			)}

			{error && (
				<div style={{
					background: '#f8d7da',
					color: '#721c24',
					padding: '12px 16px',
					borderRadius: '6px',
					marginBottom: '20px',
					border: '1px solid #f5c6cb',
					display: 'flex',
					alignItems: 'center',
					gap: '8px'
				}}>
					❌ {error}
				</div>
			)}

			{/* Summary Statistics */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
				gap: '20px',
				marginBottom: '30px'
			}}>
				<div style={{
					background: '#fff',
					padding: '20px',
					borderRadius: '12px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<div style={{
							width: '48px',
							height: '48px',
							background: '#e3f2fd',
							borderRadius: '12px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '20px'
						}}>📊</div>
						<div>
							<div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
								{stats.total}
							</div>
							<div style={{ fontSize: '14px', color: '#6c757d' }}>Total Workplans</div>
						</div>
					</div>
				</div>

				<div style={{
					background: '#fff',
					padding: '20px',
					borderRadius: '12px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<div style={{
							width: '48px',
							height: '48px',
							background: '#e8f5e8',
							borderRadius: '12px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '20px'
						}}>🟢</div>
						<div>
							<div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
								{stats.active}
							</div>
							<div style={{ fontSize: '14px', color: '#6c757d' }}>Active Projects</div>
						</div>
					</div>
				</div>

				<div style={{
					background: '#fff',
					padding: '20px',
					borderRadius: '12px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<div style={{
							width: '48px',
							height: '48px',
							background: '#f0f8f0',
							borderRadius: '12px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '20px'
						}}>✅</div>
						<div>
							<div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
								{stats.completed}
							</div>
							<div style={{ fontSize: '14px', color: '#6c757d' }}>Completed</div>
						</div>
					</div>
				</div>

				<div style={{
					background: '#fff',
					padding: '20px',
					borderRadius: '12px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<div style={{
							width: '48px',
							height: '48px',
							background: '#fff3cd',
							borderRadius: '12px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '20px'
						}}>⏸️</div>
						<div>
							<div style={{ fontSize: '24px', fontWeight: '700', color: '#856404' }}>
								{stats.onHold}
							</div>
							<div style={{ fontSize: '14px', color: '#6c757d' }}>On Hold</div>
						</div>
					</div>
				</div>

				<div style={{
					background: '#fff',
					padding: '20px',
					borderRadius: '12px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<div style={{
							width: '48px',
							height: '48px',
							background: '#f8d7da',
							borderRadius: '12px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '20px'
						}}>⚠️</div>
						<div>
							<div style={{ fontSize: '24px', fontWeight: '700', color: '#dc3545' }}>
								{stats.overdue}
							</div>
							<div style={{ fontSize: '14px', color: '#6c757d' }}>Overdue</div>
						</div>
					</div>
				</div>
			</div>

			{/* Search and Filters */}
			<div style={{
				background: '#fff',
				padding: '24px',
				borderRadius: '12px',
				marginBottom: '25px',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
				border: '1px solid #dee2e6'
			}}>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
					gap: '20px',
					alignItems: 'end'
				}}>
					<div>
						<label style={{
							display: 'block',
							marginBottom: '8px',
							fontWeight: '500',
							color: '#495057'
						}}>
							🔍 Search Workplans
						</label>
						<input
							type="text"
							placeholder="Search by title, manager, or ID..."
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
							<option value="">All Statuses</option>
							<option value="planning">Planning</option>
							<option value="active">Active</option>
							<option value="on-hold">On Hold</option>
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
							🎯 Priority
						</label>
						<select
							value={priorityFilter}
							onChange={(e) => setPriorityFilter(e.target.value)}
							style={{
								width: '100%',
								padding: '10px 12px',
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px'
							}}
						>
							<option value="">All Priorities</option>
							<option value="critical">Critical</option>
							<option value="high">High</option>
							<option value="medium">Medium</option>
							<option value="low">Low</option>
						</select>
					</div>

					<div>
						<label style={{
							display: 'block',
							marginBottom: '8px',
							fontWeight: '500',
							color: '#495057'
						}}>
							🏢 Department
						</label>
						<select
							value={departmentFilter}
							onChange={(e) => setDepartmentFilter(e.target.value)}
							style={{
								width: '100%',
								padding: '10px 12px',
								border: '1px solid #ced4da',
								borderRadius: '6px',
								fontSize: '14px'
							}}
						>
							<option value="">All Departments</option>
							{uniqueDepartments.map(dept => (
								<option key={dept} value={dept}>{dept}</option>
							))}
						</select>
					</div>

					<div>
						<button
							onClick={() => {
								setSearchTerm('');
								setStatusFilter('');
								setPriorityFilter('');
								setDepartmentFilter('');
							}}
							style={{
								width: '100%',
								padding: '10px 12px',
								background: '#6c757d',
								color: 'white',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer',
								fontSize: '14px',
								fontWeight: '500'
							}}
						>
							🗑️ Clear Filters
						</button>
					</div>
				</div>

				<div style={{ 
					marginTop: '15px', 
					fontSize: '14px', 
					color: '#6c757d',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: '10px'
				}}>
					<span>
						Showing {filteredWorkplans.length} of {workplans.length} workplans
					</span>
					{(searchTerm || statusFilter || priorityFilter || departmentFilter) && (
						<span style={{ color: '#007bff' }}>
							🔍 Filters applied
						</span>
					)}
				</div>
			</div>

			{/* Workplans Grid */}
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
						<p style={{ color: '#6c757d', margin: 0 }}>Loading workplans...</p>
					</div>
				</div>
			) : filteredWorkplans.length === 0 ? (
				<div style={{
					padding: '60px',
					textAlign: 'center',
					background: '#ffffff',
					borderRadius: '12px',
					border: '1px solid #dee2e6'
				}}>
					<div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
					{workplans.length === 0 ? (
						<>
							<h3 style={{ marginBottom: '10px', color: '#495057' }}>No Workplans Yet</h3>
							<p style={{ marginBottom: '20px', color: '#6c757d' }}>
								Create your first project workplan to start tracking progress and managing tasks.
							</p>
							<button
								onClick={handleCreateWorkplan}
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
								➕ Create First Workplan
							</button>
						</>
					) : (
						<>
							<h3 style={{ marginBottom: '10px', color: '#495057' }}>No Matching Workplans</h3>
							<p style={{ marginBottom: '0', color: '#6c757d' }}>
								No workplans match your current filters. Try adjusting your search criteria.
							</p>
						</>
					)}
				</div>
			) : (
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
					gap: '24px'
				}}>
					{filteredWorkplans.map((workplan) => {
						const priorityInfo = getPriorityInfo(workplan.priority);
						const statusInfo = getStatusInfo(workplan.status);
						const daysRemaining = calculateDaysRemaining(workplan.endDate);
						const isOverdue = daysRemaining < 0 && workplan.status !== 'completed' && workplan.status !== 'cancelled';

						return (
							<div
								key={workplan.id}
								style={{
									background: '#ffffff',
									border: '1px solid #dee2e6',
									borderRadius: '12px',
									boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
									overflow: 'hidden',
									transition: 'all 0.2s ease'
								}}
								className="workplan-card"
							>
								{/* Card Header */}
								<div style={{
									padding: '20px 24px',
									borderBottom: '1px solid #f0f0f0',
									background: isOverdue ? '#fff5f5' : '#fff'
								}}>
									<div style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'flex-start',
										marginBottom: '12px'
									}}>
										<div style={{ flex: 1, minWidth: 0 }}>
											<h4 style={{
												margin: '0 0 8px 0',
												fontSize: '18px',
												fontWeight: '600',
												color: '#2c3e50',
												wordBreak: 'break-word'
											}}>
												{workplan.title}
											</h4>
											<div style={{
												fontSize: '14px',
												color: '#6c757d',
												marginBottom: '8px'
											}}>
												{workplan.id} • {workplan.department}
											</div>
										</div>
										
										{isOverdue && (
											<div style={{
												background: '#dc3545',
												color: 'white',
												padding: '4px 8px',
												borderRadius: '12px',
												fontSize: '11px',
												fontWeight: '600',
												marginLeft: '10px',
												whiteSpace: 'nowrap'
											}}>
												⚠️ OVERDUE
											</div>
										)}
									</div>

									<div style={{
										display: 'flex',
										flexWrap: 'wrap',
										gap: '8px',
										marginBottom: '12px'
									}}>
										<span style={{
											background: statusInfo.bg,
											color: statusInfo.color,
											padding: '4px 10px',
											borderRadius: '12px',
											fontSize: '12px',
											fontWeight: '500',
											display: 'flex',
											alignItems: 'center',
											gap: '4px'
										}}>
											{statusInfo.icon} {statusInfo.label}
										</span>

										<span style={{
											background: priorityInfo.bg,
											color: priorityInfo.color,
											padding: '4px 10px',
											borderRadius: '12px',
											fontSize: '12px',
											fontWeight: '500',
											display: 'flex',
											alignItems: 'center',
											gap: '4px'
										}}>
											{priorityInfo.icon} {priorityInfo.label}
										</span>

										{workplan.budget && (
											<span style={{
												background: '#e9ecef',
												color: '#495057',
												padding: '4px 10px',
												borderRadius: '12px',
												fontSize: '12px',
												fontWeight: '500'
											}}>
												💰 {formatCurrency(workplan.budget)}
											</span>
										)}
									</div>

									<p style={{
										margin: '0',
										fontSize: '14px',
										color: '#6c757d',
										lineHeight: '1.4',
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden'
									}}>
										{workplan.description}
									</p>
								</div>

								{/* Progress Section */}
								<div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
									<div style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginBottom: '8px'
									}}>
										<span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
											Progress
										</span>
										<span style={{
											fontSize: '14px',
											fontWeight: '600',
											color: getProgressColor(workplan.progress)
										}}>
											{workplan.progress}%
										</span>
									</div>
									
									<div style={{
										width: '100%',
										height: '8px',
										background: '#e9ecef',
										borderRadius: '4px',
										overflow: 'hidden'
									}}>
										<div style={{
											width: `${workplan.progress}%`,
											height: '100%',
											background: getProgressColor(workplan.progress),
											transition: 'width 0.3s ease'
										}}></div>
									</div>
									
									<div style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginTop: '8px',
										fontSize: '12px',
										color: '#6c757d'
									}}>
										<span>
											Tasks: {workplan.completedTasks}/{workplan.tasksCount}
										</span>
										<span>
											{daysRemaining >= 0 
												? `${daysRemaining} days remaining`
												: `${Math.abs(daysRemaining)} days overdue`
											}
										</span>
									</div>
								</div>

								{/* Project Details */}
								<div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
									<div style={{
										display: 'grid',
										gridTemplateColumns: '1fr 1fr',
										gap: '12px',
										fontSize: '13px'
									}}>
										<div>
											<div style={{ color: '#495057', fontWeight: '500', marginBottom: '2px' }}>
												👤 Manager
											</div>
											<div style={{ color: '#6c757d' }}>
												{workplan.manager}
											</div>
										</div>
										
										<div>
											<div style={{ color: '#495057', fontWeight: '500', marginBottom: '2px' }}>
												👥 Team Size
											</div>
											<div style={{ color: '#6c757d' }}>
												{workplan.team.length} members
											</div>
										</div>
										
										<div>
											<div style={{ color: '#495057', fontWeight: '500', marginBottom: '2px' }}>
												📅 Start Date
											</div>
											<div style={{ color: '#6c757d' }}>
												{new Date(workplan.startDate).toLocaleDateString()}
											</div>
										</div>
										
										<div>
											<div style={{ color: '#495057', fontWeight: '500', marginBottom: '2px' }}>
												🎯 End Date
											</div>
											<div style={{ color: isOverdue ? '#dc3545' : '#6c757d' }}>
												{new Date(workplan.endDate).toLocaleDateString()}
											</div>
										</div>
									</div>
								</div>

								{/* Action Buttons */}
								<div style={{
									padding: '16px 24px',
									display: 'flex',
									gap: '8px',
									flexWrap: 'wrap'
								}}>
									<button
										onClick={() => handleViewWorkplan(workplan)}
										style={{
											padding: '8px 12px',
											background: '#17a2b8',
											color: 'white',
											border: 'none',
											borderRadius: '6px',
											cursor: 'pointer',
											fontSize: '12px',
											fontWeight: '500',
											display: 'flex',
											alignItems: 'center',
											gap: '4px'
										}}
									>
										👁️ View Details
									</button>

									<button
										onClick={() => handleEditWorkplan(workplan)}
										style={{
											padding: '8px 12px',
											background: '#28a745',
											color: 'white',
											border: 'none',
											borderRadius: '6px',
											cursor: 'pointer',
											fontSize: '12px',
											fontWeight: '500',
											display: 'flex',
											alignItems: 'center',
											gap: '4px'
										}}
									>
										✏️ Edit
									</button>

									<button
										onClick={() => handleManageTasks(workplan)}
										style={{
											padding: '8px 12px',
											background: '#6f42c1',
											color: 'white',
											border: 'none',
											borderRadius: '6px',
											cursor: 'pointer',
											fontSize: '12px',
											fontWeight: '500',
											display: 'flex',
											alignItems: 'center',
											gap: '4px'
										}}
									>
										📝 Tasks
									</button>

									<div style={{ marginLeft: 'auto' }}>
										<button
											onClick={() => handleDeleteWorkplan(workplan.id)}
											style={{
												padding: '8px 10px',
												background: '#dc3545',
												color: 'white',
												border: 'none',
												borderRadius: '6px',
												cursor: 'pointer',
												fontSize: '12px',
												fontWeight: '500'
											}}
											title="Delete workplan"
										>
											🗑️
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Create/Edit Workplan Modal */}
			{(isCreateModalOpen || isEditModalOpen) && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0,0,0,0.5)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: 1000
				}}>
					<div style={{
						background: '#fff',
						borderRadius: '12px',
						width: '90%',
						maxWidth: '600px',
						maxHeight: '90vh',
						overflow: 'auto',
						position: 'relative'
					}}>
						<div style={{
							padding: '24px',
							borderBottom: '1px solid #dee2e6',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							position: 'sticky',
							top: 0,
							background: '#fff',
							zIndex: 1
						}}>
							<h3 style={{ margin: 0, color: '#2c3e50' }}>
								{isEditModalOpen ? 'Edit Workplan' : 'Create New Workplan'}
							</h3>
							<button
								onClick={closeModals}
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

						<form onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
							<div style={{ marginBottom: '20px' }}>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									📝 Workplan Title *
								</label>
								<input
									type="text"
									value={formData.title}
									onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
									placeholder="Enter workplan title..."
									style={{
										width: '100%',
										padding: '12px',
										border: `1px solid ${formErrors.title ? '#dc3545' : '#ced4da'}`,
										borderRadius: '6px',
										fontSize: '14px'
									}}
								/>
								{formErrors.title && (
									<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
										{formErrors.title}
									</div>
								)}
							</div>

							<div style={{ marginBottom: '20px' }}>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									📄 Description
								</label>
								<textarea
									value={formData.description}
									onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
									placeholder="Enter workplan description..."
									rows={3}
									style={{
										width: '100%',
										padding: '12px',
										border: '1px solid #ced4da',
										borderRadius: '6px',
										fontSize: '14px',
										resize: 'vertical'
									}}
								/>
							</div>

							<div style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
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
										🏢 Department *
									</label>
									<select
										value={formData.department}
										onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${formErrors.department ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									>
										<option value="">Select Department</option>
										<option value="Procurement">Procurement</option>
										<option value="Legal">Legal</option>
										<option value="Finance">Finance</option>
										<option value="IT">IT</option>
										<option value="HR">HR</option>
										<option value="Operations">Operations</option>
									</select>
									{formErrors.department && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{formErrors.department}
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
										🎯 Priority
									</label>
									<select
										value={formData.priority}
										onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
										style={{
											width: '100%',
											padding: '12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
										}}
									>
										<option value="low">Low</option>
										<option value="medium">Medium</option>
										<option value="high">High</option>
										<option value="critical">Critical</option>
									</select>
								</div>
							</div>

							<div style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
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
										📅 Start Date *
									</label>
									<input
										type="date"
										value={formData.startDate}
										onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${formErrors.startDate ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
									{formErrors.startDate && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{formErrors.startDate}
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
										🎯 End Date *
									</label>
									<input
										type="date"
										value={formData.endDate}
										onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${formErrors.endDate ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
									{formErrors.endDate && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{formErrors.endDate}
										</div>
									)}
								</div>
							</div>

							<div style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
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
										👤 Project Manager *
									</label>
									<input
										type="text"
										value={formData.manager}
										onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
										placeholder="Enter manager name..."
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${formErrors.manager ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
									{formErrors.manager && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{formErrors.manager}
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
										💰 Budget
									</label>
									<input
										type="number"
										value={formData.budget}
										onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
										placeholder="Enter budget amount..."
										style={{
											width: '100%',
											padding: '12px',
											border: `1px solid ${formErrors.budget ? '#dc3545' : '#ced4da'}`,
											borderRadius: '6px',
											fontSize: '14px'
										}}
									/>
									{formErrors.budget && (
										<div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
											{formErrors.budget}
										</div>
									)}
								</div>
							</div>

							{isEditModalOpen && (
								<div style={{ marginBottom: '20px' }}>
									<label style={{
										display: 'block',
										marginBottom: '8px',
										fontWeight: '500',
										color: '#495057'
									}}>
										📊 Status
									</label>
									<select
										value={formData.status}
										onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
										style={{
											width: '100%',
											padding: '12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
										}}
									>
										<option value="planning">Planning</option>
										<option value="active">Active</option>
										<option value="on-hold">On Hold</option>
										<option value="completed">Completed</option>
										<option value="cancelled">Cancelled</option>
									</select>
								</div>
							)}

							<div style={{
								display: 'flex',
								justifyContent: 'flex-end',
								gap: '12px',
								paddingTop: '20px',
								borderTop: '1px solid #dee2e6'
							}}>
								<button
									type="button"
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
									Cancel
								</button>

								<button
									type="submit"
									disabled={isLoading}
									style={{
										padding: '10px 20px',
										background: isLoading ? '#ccc' : '#007bff',
										color: 'white',
										border: 'none',
										borderRadius: '6px',
										cursor: isLoading ? 'not-allowed' : 'pointer',
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									{isLoading ? 'Saving...' : (isEditModalOpen ? 'Update Workplan' : 'Create Workplan')}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* View Workplan Modal */}
			{isViewModalOpen && selectedWorkplan && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0,0,0,0.5)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: 1000
				}}>
					<div style={{
						background: '#fff',
						borderRadius: '12px',
						width: '90%',
						maxWidth: '800px',
						maxHeight: '90vh',
						overflow: 'auto',
						position: 'relative'
					}}>
						<div style={{
							padding: '24px',
							borderBottom: '1px solid #dee2e6',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							position: 'sticky',
							top: 0,
							background: '#fff',
							zIndex: 1
						}}>
							<h3 style={{ margin: 0, color: '#2c3e50' }}>
								{selectedWorkplan.title}
							</h3>
							<button
								onClick={closeModals}
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

						<div style={{ padding: '24px' }}>
							{/* Workplan Overview */}
							<div style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
								gap: '20px',
								marginBottom: '30px'
							}}>
								<div style={{
									padding: '16px',
									background: '#f8f9fa',
									borderRadius: '8px',
									border: '1px solid #dee2e6'
								}}>
									<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
										Status
									</div>
									<div style={{
										display: 'flex',
										alignItems: 'center',
										gap: '8px'
									}}>
										{(() => {
											const statusInfo = getStatusInfo(selectedWorkplan.status);
											return (
												<span style={{
													background: statusInfo.bg,
													color: statusInfo.color,
													padding: '4px 10px',
													borderRadius: '12px',
													fontSize: '12px',
													fontWeight: '500'
												}}>
													{statusInfo.icon} {statusInfo.label}
												</span>
											);
										})()}
									</div>
								</div>

								<div style={{
									padding: '16px',
									background: '#f8f9fa',
									borderRadius: '8px',
									border: '1px solid #dee2e6'
								}}>
									<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
										Priority
									</div>
									<div>
										{(() => {
											const priorityInfo = getPriorityInfo(selectedWorkplan.priority);
											return (
												<span style={{
													background: priorityInfo.bg,
													color: priorityInfo.color,
													padding: '4px 10px',
													borderRadius: '12px',
													fontSize: '12px',
													fontWeight: '500'
												}}>
													{priorityInfo.icon} {priorityInfo.label}
												</span>
											);
										})()}
									</div>
								</div>

								<div style={{
									padding: '16px',
									background: '#f8f9fa',
									borderRadius: '8px',
									border: '1px solid #dee2e6'
								}}>
									<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
										Progress
									</div>
									<div style={{ fontSize: '18px', fontWeight: '600', color: getProgressColor(selectedWorkplan.progress) }}>
										{selectedWorkplan.progress}%
									</div>
								</div>

								<div style={{
									padding: '16px',
									background: '#f8f9fa',
									borderRadius: '8px',
									border: '1px solid #dee2e6'
								}}>
									<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
										Budget
									</div>
									<div style={{ fontSize: '14px', color: '#6c757d' }}>
										{selectedWorkplan.budget ? formatCurrency(selectedWorkplan.budget) : 'Not specified'}
									</div>
								</div>
							</div>

							{/* Project Details */}
							<div style={{ marginBottom: '30px' }}>
								<h4 style={{ marginBottom: '16px', color: '#2c3e50' }}>Project Details</h4>
								<div style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
									gap: '16px'
								}}>
									<div>
										<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
											📋 Description
										</div>
										<div style={{ color: '#6c757d', lineHeight: '1.4' }}>
											{selectedWorkplan.description}
										</div>
									</div>

									<div>
										<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
											🏢 Department
										</div>
										<div style={{ color: '#6c757d' }}>
											{selectedWorkplan.department}
										</div>
									</div>

									<div>
										<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
											👤 Project Manager
										</div>
										<div style={{ color: '#6c757d' }}>
											{selectedWorkplan.manager}
										</div>
									</div>

									<div>
										<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
											👥 Team Members
										</div>
										<div style={{ color: '#6c757d' }}>
											{selectedWorkplan.team.length} members
										</div>
									</div>

									<div>
										<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
											📅 Start Date
										</div>
										<div style={{ color: '#6c757d' }}>
											{new Date(selectedWorkplan.startDate).toLocaleDateString()}
										</div>
									</div>

									<div>
										<div style={{ fontWeight: '500', color: '#495057', marginBottom: '4px' }}>
											🎯 End Date
										</div>
										<div style={{ color: '#6c757d' }}>
											{new Date(selectedWorkplan.endDate).toLocaleDateString()}
										</div>
									</div>
								</div>
							</div>

							{/* Tasks Section */}
							<div>
								<h4 style={{ marginBottom: '16px', color: '#2c3e50' }}>
									Tasks ({tasks.length})
								</h4>
								{tasks.length > 0 ? (
									<div style={{ maxHeight: '300px', overflow: 'auto' }}>
										{tasks.map((task, index) => (
											<div
												key={task.id}
												style={{
													padding: '12px 16px',
													border: '1px solid #dee2e6',
													borderRadius: '8px',
													marginBottom: '8px',
													background: '#f8f9fa'
												}}
											>
												<div style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'flex-start',
													marginBottom: '8px'
												}}>
													<div style={{ fontWeight: '500', color: '#2c3e50' }}>
														{task.title}
													</div>
													<span style={{
														background: task.status === 'completed' ? '#d4edda' : 
																	task.status === 'in-progress' ? '#cce7ff' : '#fff3cd',
														color: task.status === 'completed' ? '#155724' : 
															   task.status === 'in-progress' ? '#004085' : '#856404',
														padding: '2px 8px',
														borderRadius: '12px',
														fontSize: '11px',
														fontWeight: '500'
													}}>
														{task.status.replace('-', ' ').toUpperCase()}
													</span>
												</div>
												<div style={{
													display: 'flex',
													justifyContent: 'space-between',
													fontSize: '13px',
													color: '#6c757d'
												}}>
													<span>👤 {task.assignee}</span>
													<span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>
												</div>
											</div>
										))}
									</div>
								) : (
									<div style={{
										padding: '40px',
										textAlign: 'center',
										color: '#6c757d',
										background: '#f8f9fa',
										borderRadius: '8px',
										border: '1px solid #dee2e6'
									}}>
										No tasks found for this workplan.
									</div>
								)}
							</div>

							<div style={{
								display: 'flex',
								justifyContent: 'flex-end',
								gap: '12px',
								paddingTop: '20px',
								borderTop: '1px solid #dee2e6'
							}}>
								<button
									onClick={() => handleEditWorkplan(selectedWorkplan)}
									style={{
										padding: '10px 20px',
										background: '#28a745',
										color: 'white',
										border: 'none',
										borderRadius: '6px',
										cursor: 'pointer',
										fontSize: '14px',
										fontWeight: '500'
									}}
								>
									✏️ Edit Workplan
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Task Management Modal */}
			{isTaskModalOpen && selectedWorkplan && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0,0,0,0.5)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: 1000
				}}>
					<div style={{
						background: '#fff',
						borderRadius: '12px',
						width: '90%',
						maxWidth: '900px',
						maxHeight: '90vh',
						overflow: 'auto',
						position: 'relative'
					}}>
						<div style={{
							padding: '24px',
							borderBottom: '1px solid #dee2e6',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							position: 'sticky',
							top: 0,
							background: '#fff',
							zIndex: 1
						}}>
							<h3 style={{ margin: 0, color: '#2c3e50' }}>
								Manage Tasks - {selectedWorkplan.title}
							</h3>
							<button
								onClick={closeModals}
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

						<div style={{ padding: '24px' }}>
							<div style={{
								padding: '20px',
								background: '#f8f9fa',
								borderRadius: '8px',
								textAlign: 'center',
								color: '#6c757d'
							}}>
								<div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
								<h4 style={{ marginBottom: '8px', color: '#495057' }}>Task Management Coming Soon</h4>
								<p style={{ margin: 0 }}>
									Advanced task management features including task creation, assignment, 
									tracking, and Gantt chart visualization will be available in the next update.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Custom Styles */}
			<style>{`
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
				
				.workplan-card:hover {
					transform: translateY(-2px);
					box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
				}
			`}</style>
		</div>
	);
};

export default WorkplanPage;
