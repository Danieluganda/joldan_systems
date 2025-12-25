import React, { useState, useRef } from 'react';

/**
 * Excel Import Page - Interface for importing procurement plans from Excel files
 * 
 * Features:
 * - File upload and validation
 * - Excel preview and column mapping
 * - Import configuration
 * - Progress tracking
 * - Error handling and reporting
 */

export default function ExcelImportPage() {
	const [currentStep, setCurrentStep] = useState(1);
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewData, setPreviewData] = useState(null);
	const [columnMapping, setColumnMapping] = useState({});
	const [importConfig, setImportConfig] = useState({
		sheetName: '',
		hasHeaders: true,
		startRow: 1,
		skipEmptyRows: true,
		validateData: true
	});
	const [isProcessing, setIsProcessing] = useState(false);
	const [importResults, setImportResults] = useState(null);
	const [errors, setErrors] = useState([]);
	
	const fileInputRef = useRef(null);

	const steps = [
		{ id: 1, title: 'Upload File', icon: '📤' },
		{ id: 2, title: 'Configure Import', icon: '⚙️' },
		{ id: 3, title: 'Map Columns', icon: '🗂️' },
		{ id: 4, title: 'Import Results', icon: '✅' }
	];

	const requiredFields = [
		{ key: 'title', label: 'Plan Title', required: true },
		{ key: 'description', label: 'Description', required: false },
		{ key: 'category', label: 'Category', required: true },
		{ key: 'department', label: 'Department', required: true },
		{ key: 'totalBudget', label: 'Total Budget', required: true },
		{ key: 'year', label: 'Planning Year', required: false },
		{ key: 'priority', label: 'Priority', required: false }
	];

	// Mock Excel data for preview
	const mockExcelData = {
		sheets: ['Procurement Plans', 'Items', 'Budget'],
		data: [
			['Plan Title', 'Description', 'Category', 'Department', 'Total Budget', 'Year', 'Priority'],
			['Infrastructure Upgrade 2025', 'Major infrastructure improvements', 'Infrastructure', 'Public Works', '5000000', '2025', 'High'],
			['IT Equipment Refresh', 'Annual IT equipment replacement', 'Technology', 'IT Department', '750000', '2025', 'Medium'],
			['Medical Equipment Purchase', 'Essential medical equipment acquisition', 'Healthcare', 'Health Services', '2200000', '2025', 'Critical'],
			['Office Supplies Annual', 'Yearly office supplies procurement', 'Office Supplies', 'Administration', '150000', '2025', 'Low']
		]
	};

	const handleFileSelect = (event) => {
		const file = event.target.files[0];
		if (!file) return;

		// Validate file type
		const validTypes = [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel',
			'text/csv'
		];

		if (!validTypes.includes(file.type)) {
			setErrors(['Please select a valid Excel file (.xlsx, .xls) or CSV file']);
			return;
		}

		// Validate file size (max 10MB)
		if (file.size > 10 * 1024 * 1024) {
			setErrors(['File size must be less than 10MB']);
			return;
		}

		setSelectedFile(file);
		setErrors([]);
		
		// Simulate file processing
		setTimeout(() => {
			setPreviewData(mockExcelData);
			setImportConfig(prev => ({
				...prev,
				sheetName: mockExcelData.sheets[0]
			}));
		}, 1000);
	};

	const handleColumnMapping = (fieldKey, excelColumn) => {
		setColumnMapping(prev => ({
			...prev,
			[fieldKey]: excelColumn
		}));
	};

	const validateMapping = () => {
		const newErrors = [];
		
		requiredFields.forEach(field => {
			if (field.required && !columnMapping[field.key]) {
				newErrors.push(`${field.label} is required but not mapped`);
			}
		});

		setErrors(newErrors);
		return newErrors.length === 0;
	};

	const processImport = async () => {
		if (!validateMapping()) return;

		setIsProcessing(true);
		try {
			// Simulate import process
			await new Promise(resolve => setTimeout(resolve, 3000));

			// Mock import results
			setImportResults({
				totalRecords: previewData.data.length - 1,
				successfulImports: previewData.data.length - 2,
				failedImports: 1,
				warnings: 2,
				createdPlans: [
					{ id: 'PLAN-2025-004', title: 'Infrastructure Upgrade 2025', status: 'created' },
					{ id: 'PLAN-2025-005', title: 'IT Equipment Refresh', status: 'created' },
					{ id: 'PLAN-2025-006', title: 'Medical Equipment Purchase', status: 'created' }
				],
				errors: [
					{ row: 5, field: 'totalBudget', message: 'Invalid budget format' }
				],
				warnings: [
					{ row: 2, field: 'priority', message: 'Priority defaulted to Medium' },
					{ row: 4, field: 'year', message: 'Year defaulted to current year' }
				]
			});
			
			setCurrentStep(4);
		} catch (error) {
			setErrors(['Import failed. Please try again.']);
		} finally {
			setIsProcessing(false);
		}
	};

	const resetImport = () => {
		setCurrentStep(1);
		setSelectedFile(null);
		setPreviewData(null);
		setColumnMapping({});
		setImportConfig({
			sheetName: '',
			hasHeaders: true,
			startRow: 1,
			skipEmptyRows: true,
			validateData: true
		});
		setImportResults(null);
		setErrors([]);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const downloadTemplate = () => {
		// Create mock Excel template download
		const csvContent = [
			'Plan Title,Description,Category,Department,Total Budget,Year,Priority',
			'Sample Infrastructure Plan,Description of the plan,Infrastructure,Public Works,1000000,2025,High',
			'Sample IT Plan,IT equipment procurement,Technology,IT Department,500000,2025,Medium'
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'procurement-plans-template.csv';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
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
							📤 Import Procurement Plans
						</h1>
						<p style={{
							margin: 0,
							color: '#6c757d',
							fontSize: '16px'
						}}>
							Import procurement plans from Excel or CSV files
						</p>
					</div>

					<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
						<button
							onClick={downloadTemplate}
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
							📥 Download Template
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
						const isCompleted = step.id < currentStep || (step.id === 4 && importResults);

						return (
							<React.Fragment key={step.id}>
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									flex: 1
								}}>
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
										background: step.id < currentStep || (step.id === 3 && importResults) ? '#28a745' : '#e9ecef',
										flex: '1',
										margin: '0 16px 24px'
									}}></div>
								)}
							</React.Fragment>
						);
					})}
				</div>
			</div>

			{/* Error Display */}
			{errors.length > 0 && (
				<div style={{
					background: '#f8d7da',
					border: '1px solid #f5c6cb',
					borderRadius: '8px',
					padding: '16px',
					marginBottom: '24px'
				}}>
					<div style={{ color: '#721c24', fontWeight: '600', marginBottom: '8px' }}>
						⚠️ Import Errors
					</div>
					<ul style={{ margin: 0, paddingLeft: '20px', color: '#721c24' }}>
						{errors.map((error, index) => (
							<li key={index}>{error}</li>
						))}
					</ul>
				</div>
			)}

			{/* Main Content */}
			<div style={{
				background: '#ffffff',
				borderRadius: '12px',
				border: '1px solid #dee2e6',
				minHeight: '500px'
			}}>
				{/* Step 1: Upload File */}
				{currentStep === 1 && (
					<div style={{ padding: '40px', textAlign: 'center' }}>
						<div style={{ marginBottom: '32px' }}>
							<div style={{ fontSize: '64px', marginBottom: '20px' }}>📤</div>
							<h2 style={{ marginBottom: '16px', color: '#2c3e50' }}>
								Upload Excel or CSV File
							</h2>
							<p style={{ color: '#6c757d', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
								Select an Excel (.xlsx, .xls) or CSV file containing your procurement plans data. 
								The file should include columns for plan details like title, category, department, and budget.
							</p>
						</div>

						{!selectedFile ? (
							<div>
								<input
									ref={fileInputRef}
									type="file"
									accept=".xlsx,.xls,.csv"
									onChange={handleFileSelect}
									style={{ display: 'none' }}
								/>
								
								<button
									onClick={() => fileInputRef.current?.click()}
									style={{
										padding: '20px 40px',
										background: '#007bff',
										color: 'white',
										border: 'none',
										borderRadius: '12px',
										cursor: 'pointer',
										fontSize: '16px',
										fontWeight: '600',
										display: 'inline-flex',
										alignItems: 'center',
										gap: '12px',
										marginBottom: '24px'
									}}
								>
									📁 Choose File
								</button>

								<div style={{
									maxWidth: '600px',
									margin: '0 auto',
									padding: '24px',
									background: '#f8f9fa',
									borderRadius: '8px',
									border: '1px solid #dee2e6'
								}}>
									<h3 style={{ marginBottom: '16px', color: '#495057' }}>📋 File Requirements</h3>
									<ul style={{ textAlign: 'left', color: '#6c757d', lineHeight: '1.6' }}>
										<li>Supported formats: Excel (.xlsx, .xls) or CSV (.csv)</li>
										<li>Maximum file size: 10MB</li>
										<li>Should include headers in the first row</li>
										<li>Required columns: Plan Title, Category, Department, Total Budget</li>
										<li>Optional columns: Description, Year, Priority, Start Date, End Date</li>
									</ul>
								</div>
							</div>
						) : (
							<div style={{
								maxWidth: '500px',
								margin: '0 auto',
								padding: '24px',
								background: '#d4edda',
								border: '1px solid #c3e6cb',
								borderRadius: '8px'
							}}>
								<div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
								<h3 style={{ color: '#155724', marginBottom: '8px' }}>
									File Selected Successfully
								</h3>
								<p style={{ margin: '0 0 16px 0', color: '#155724' }}>
									<strong>{selectedFile.name}</strong>
								</p>
								<div style={{ color: '#155724', fontSize: '14px', marginBottom: '20px' }}>
									Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
								</div>

								{previewData && (
									<button
										onClick={() => setCurrentStep(2)}
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
										Continue →
									</button>
								)}
							</div>
						)}
					</div>
				)}

				{/* Step 2: Configure Import */}
				{currentStep === 2 && (
					<div style={{ padding: '32px' }}>
						<h2 style={{ marginBottom: '24px', color: '#2c3e50' }}>
							⚙️ Configure Import Settings
						</h2>

						<div style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
							gap: '24px',
							marginBottom: '32px'
						}}>
							<div>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									Excel Sheet
								</label>
								<select
									value={importConfig.sheetName}
									onChange={(e) => setImportConfig(prev => ({ ...prev, sheetName: e.target.value }))}
									style={{
										width: '100%',
										padding: '12px',
										border: '1px solid #ced4da',
										borderRadius: '6px',
										fontSize: '14px'
									}}
								>
									{previewData?.sheets.map(sheet => (
										<option key={sheet} value={sheet}>{sheet}</option>
									))}
								</select>
							</div>

							<div>
								<label style={{
									display: 'block',
									marginBottom: '8px',
									fontWeight: '500',
									color: '#495057'
								}}>
									Start From Row
								</label>
								<input
									type="number"
									min="1"
									value={importConfig.startRow}
									onChange={(e) => setImportConfig(prev => ({ ...prev, startRow: parseInt(e.target.value) }))}
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

						<div style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '16px',
							marginBottom: '32px'
						}}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<input
									type="checkbox"
									id="hasHeaders"
									checked={importConfig.hasHeaders}
									onChange={(e) => setImportConfig(prev => ({ ...prev, hasHeaders: e.target.checked }))}
									style={{ transform: 'scale(1.2)' }}
								/>
								<label htmlFor="hasHeaders" style={{ fontSize: '14px', color: '#495057' }}>
									First row contains headers
								</label>
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<input
									type="checkbox"
									id="skipEmpty"
									checked={importConfig.skipEmptyRows}
									onChange={(e) => setImportConfig(prev => ({ ...prev, skipEmptyRows: e.target.checked }))}
									style={{ transform: 'scale(1.2)' }}
								/>
								<label htmlFor="skipEmpty" style={{ fontSize: '14px', color: '#495057' }}>
									Skip empty rows
								</label>
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<input
									type="checkbox"
									id="validate"
									checked={importConfig.validateData}
									onChange={(e) => setImportConfig(prev => ({ ...prev, validateData: e.target.checked }))}
									style={{ transform: 'scale(1.2)' }}
								/>
								<label htmlFor="validate" style={{ fontSize: '14px', color: '#495057' }}>
									Validate data before importing
								</label>
							</div>
						</div>

						{/* Data Preview */}
						{previewData && (
							<div style={{
								background: '#f8f9fa',
								border: '1px solid #dee2e6',
								borderRadius: '8px',
								padding: '20px',
								marginBottom: '24px'
							}}>
								<h3 style={{ marginBottom: '16px', color: '#495057' }}>📊 Data Preview</h3>
								<div style={{
									overflowX: 'auto',
									maxHeight: '300px',
									border: '1px solid #ced4da',
									borderRadius: '4px'
								}}>
									<table style={{
										width: '100%',
										borderCollapse: 'collapse',
										fontSize: '13px'
									}}>
										<thead>
											<tr style={{ background: '#e9ecef' }}>
												{previewData.data[0].map((header, index) => (
													<th key={index} style={{
														padding: '8px 12px',
														borderBottom: '1px solid #ced4da',
														textAlign: 'left',
														fontWeight: '600',
														color: '#495057',
														whiteSpace: 'nowrap'
													}}>
														{header}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{previewData.data.slice(1, 6).map((row, rowIndex) => (
												<tr key={rowIndex}>
													{row.map((cell, cellIndex) => (
														<td key={cellIndex} style={{
															padding: '8px 12px',
															borderBottom: '1px solid #f0f0f0',
															whiteSpace: 'nowrap',
															color: '#495057'
														}}>
															{cell}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
									Showing first 5 rows of {previewData.data.length - 1} data rows
								</div>
							</div>
						)}

						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<button
								onClick={() => setCurrentStep(1)}
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
								← Previous
							</button>
							
							<button
								onClick={() => setCurrentStep(3)}
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
								Next →
							</button>
						</div>
					</div>
				)}

				{/* Step 3: Map Columns */}
				{currentStep === 3 && (
					<div style={{ padding: '32px' }}>
						<h2 style={{ marginBottom: '24px', color: '#2c3e50' }}>
							🗂️ Map Columns
						</h2>
						<p style={{ marginBottom: '32px', color: '#6c757d' }}>
							Match your Excel columns with the required plan fields. Required fields are marked with *.
						</p>

						<div style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '16px',
							marginBottom: '32px'
						}}>
							{requiredFields.map(field => (
								<div key={field.key} style={{
									display: 'grid',
									gridTemplateColumns: '200px 1fr',
									alignItems: 'center',
									gap: '16px',
									padding: '16px',
									background: field.required ? '#fff3cd' : '#f8f9fa',
									border: `1px solid ${field.required ? '#ffeaa7' : '#dee2e6'}`,
									borderRadius: '8px'
								}}>
									<div style={{ fontWeight: '500', color: '#495057' }}>
										{field.label} {field.required && <span style={{ color: '#dc3545' }}>*</span>}
									</div>
									<select
										value={columnMapping[field.key] || ''}
										onChange={(e) => handleColumnMapping(field.key, e.target.value)}
										style={{
											padding: '8px 12px',
											border: '1px solid #ced4da',
											borderRadius: '6px',
											fontSize: '14px'
										}}
									>
										<option value="">-- Select Column --</option>
										{previewData?.data[0].map((column, index) => (
											<option key={index} value={column}>{column}</option>
										))}
									</select>
								</div>
							))}
						</div>

						{/* Mapping Summary */}
						<div style={{
							background: '#e7f3ff',
							border: '1px solid #b3d7ff',
							borderRadius: '8px',
							padding: '16px',
							marginBottom: '24px'
						}}>
							<h4 style={{ marginBottom: '12px', color: '#0066cc' }}>📋 Mapping Summary</h4>
							<div style={{ fontSize: '14px', color: '#495057' }}>
								Mapped fields: {Object.keys(columnMapping).filter(key => columnMapping[key]).length} of {requiredFields.length}
							</div>
						</div>

						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<button
								onClick={() => setCurrentStep(2)}
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
								← Previous
							</button>
							
							<button
								onClick={processImport}
								disabled={isProcessing}
								style={{
									padding: '12px 32px',
									background: isProcessing ? '#6c757d' : '#28a745',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: isProcessing ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}
							>
								{isProcessing ? (
									<>
										<div style={{
											width: '16px',
											height: '16px',
											border: '2px solid #ffffff40',
											borderTop: '2px solid #ffffff',
											borderRadius: '50%',
											animation: 'spin 1s linear infinite'
										}}></div>
										Processing...
									</>
								) : (
									'🚀 Start Import'
								)}
							</button>
						</div>
					</div>
				)}

				{/* Step 4: Import Results */}
				{currentStep === 4 && importResults && (
					<div style={{ padding: '32px' }}>
						<div style={{ textAlign: 'center', marginBottom: '32px' }}>
							<div style={{ fontSize: '64px', marginBottom: '16px' }}>
								{importResults.failedImports === 0 ? '✅' : '⚠️'}
							</div>
							<h2 style={{ color: '#2c3e50', marginBottom: '8px' }}>
								Import {importResults.failedImports === 0 ? 'Completed' : 'Completed with Issues'}
							</h2>
						</div>

						{/* Results Summary */}
						<div style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
							gap: '16px',
							marginBottom: '32px'
						}}>
							<div style={{
								background: '#d4edda',
								border: '1px solid #c3e6cb',
								borderRadius: '8px',
								padding: '16px',
								textAlign: 'center'
							}}>
								<div style={{ fontSize: '24px', fontWeight: '700', color: '#155724' }}>
									{importResults.successfulImports}
								</div>
								<div style={{ fontSize: '14px', color: '#155724' }}>
									Successful
								</div>
							</div>

							{importResults.failedImports > 0 && (
								<div style={{
									background: '#f8d7da',
									border: '1px solid #f5c6cb',
									borderRadius: '8px',
									padding: '16px',
									textAlign: 'center'
								}}>
									<div style={{ fontSize: '24px', fontWeight: '700', color: '#721c24' }}>
										{importResults.failedImports}
									</div>
									<div style={{ fontSize: '14px', color: '#721c24' }}>
										Failed
									</div>
								</div>
							)}

							{importResults.warnings > 0 && (
								<div style={{
									background: '#fff3cd',
									border: '1px solid #ffeaa7',
									borderRadius: '8px',
									padding: '16px',
									textAlign: 'center'
								}}>
									<div style={{ fontSize: '24px', fontWeight: '700', color: '#856404' }}>
										{importResults.warnings}
									</div>
									<div style={{ fontSize: '14px', color: '#856404' }}>
										Warnings
									</div>
								</div>
							)}

							<div style={{
								background: '#e7f3ff',
								border: '1px solid #b3d7ff',
								borderRadius: '8px',
								padding: '16px',
								textAlign: 'center'
							}}>
								<div style={{ fontSize: '24px', fontWeight: '700', color: '#0066cc' }}>
									{importResults.totalRecords}
								</div>
								<div style={{ fontSize: '14px', color: '#0066cc' }}>
									Total Records
								</div>
							</div>
						</div>

						{/* Created Plans */}
						{importResults.createdPlans.length > 0 && (
							<div style={{
								background: '#d4edda',
								border: '1px solid #c3e6cb',
								borderRadius: '8px',
								padding: '20px',
								marginBottom: '20px'
							}}>
								<h4 style={{ color: '#155724', marginBottom: '12px' }}>
									✅ Successfully Created Plans
								</h4>
								{importResults.createdPlans.map(plan => (
									<div key={plan.id} style={{
										background: '#ffffff',
										border: '1px solid #c3e6cb',
										borderRadius: '4px',
										padding: '12px',
										marginBottom: '8px',
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center'
									}}>
										<span style={{ color: '#155724' }}>
											<strong>{plan.id}:</strong> {plan.title}
										</span>
										<span style={{
											background: '#28a745',
											color: 'white',
											padding: '4px 8px',
											borderRadius: '12px',
											fontSize: '12px'
										}}>
											Created
										</span>
									</div>
								))}
							</div>
						)}

						{/* Errors */}
						{importResults.errors.length > 0 && (
							<div style={{
								background: '#f8d7da',
								border: '1px solid #f5c6cb',
								borderRadius: '8px',
								padding: '20px',
								marginBottom: '20px'
							}}>
								<h4 style={{ color: '#721c24', marginBottom: '12px' }}>
									❌ Errors
								</h4>
								{importResults.errors.map((error, index) => (
									<div key={index} style={{
										background: '#ffffff',
										border: '1px solid #f5c6cb',
										borderRadius: '4px',
										padding: '12px',
										marginBottom: '8px',
										color: '#721c24'
									}}>
										<strong>Row {error.row}:</strong> {error.field} - {error.message}
									</div>
								))}
							</div>
						)}

						{/* Warnings */}
						{importResults.warnings.length > 0 && (
							<div style={{
								background: '#fff3cd',
								border: '1px solid #ffeaa7',
								borderRadius: '8px',
								padding: '20px',
								marginBottom: '32px'
							}}>
								<h4 style={{ color: '#856404', marginBottom: '12px' }}>
									⚠️ Warnings
								</h4>
								{importResults.warnings.map((warning, index) => (
									<div key={index} style={{
										background: '#ffffff',
										border: '1px solid #ffeaa7',
										borderRadius: '4px',
										padding: '12px',
										marginBottom: '8px',
										color: '#856404'
									}}>
										<strong>Row {warning.row}:</strong> {warning.field} - {warning.message}
									</div>
								))}
							</div>
						)}

						{/* Actions */}
						<div style={{
							display: 'flex',
							justifyContent: 'center',
							gap: '16px'
						}}>
							<button
								onClick={resetImport}
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
								Import Another File
							</button>

							<button
								onClick={() => window.location.href = '/plans'}
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
								View All Plans
							</button>
						</div>
					</div>
				)}
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