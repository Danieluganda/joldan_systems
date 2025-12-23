import React, { useState } from 'react';

export default function TemplateManager() {
	const [templates, setTemplates] = useState([]);
	const [selectedTemplate, setSelectedTemplate] = useState(null);
	const [templateName, setTemplateName] = useState('');
	const [templateType, setTemplateType] = useState('rfq');
	const [isLocked, setIsLocked] = useState(false);

	const templateTypes = [
		{ value: 'rfq', label: 'Request for Quotation (RFQ)' },
		{ value: 'tor', label: 'Terms of Reference (TOR)' },
		{ value: 'evaluation', label: 'Evaluation Criteria' },
		{ value: 'contract', label: 'Contract Terms' }
	];

	const handleCreateTemplate = async (e) => {
		e.preventDefault();
		if (!templateName.trim()) return;

		try {
			const response = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: templateName, type: templateType })
			});
			if (response.ok) {
				setTemplateName('');
				window.location.reload();
			}
		} catch (error) {
			console.error('Error creating template:', error);
		}
	};

	const handleLockTemplate = async (templateId) => {
		try {
			const response = await fetch(`/api/templates/${templateId}/lock`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ locked: true })
			});
			if (response.ok) {
				window.location.reload();
			}
		} catch (error) {
			console.error('Error locking template:', error);
		}
	};

	return (
		<div style={{ padding: '30px' }}>
					<h1>📄 Template Manager</h1>
					<p>Manage RFQ, TOR and evaluation templates. Lock versions and map fields to procurement metadata.</p>

					<section style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
						<h3>Create New Template</h3>
						<form onSubmit={handleCreateTemplate}>
							<div style={{ marginBottom: '15px' }}>
								<label>Template Name:</label>
								<input
									type="text"
									placeholder="e.g., Standard RFQ 2025"
									value={templateName}
									onChange={(e) => setTemplateName(e.target.value)}
									style={{ padding: '8px', width: '100%', maxWidth: '400px', marginTop: '5px' }}
								/>
							</div>
							<div style={{ marginBottom: '15px' }}>
								<label>Template Type:</label>
								<select
									value={templateType}
									onChange={(e) => setTemplateType(e.target.value)}
									style={{ padding: '8px', width: '100%', maxWidth: '400px', marginTop: '5px' }}
								>
									{templateTypes.map((type) => (
										<option key={type.value} value={type.value}>{type.label}</option>
									))}
								</select>
							</div>
							<button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
								Create Template
							</button>
						</form>
					</section>

					<section style={{ marginTop: '30px' }}>
						<h3>Available Templates</h3>
						<div style={{ marginTop: '20px' }}>
							{['RFQ Standard 2025', 'TOR Evaluation', 'Contract Template'].map((template, idx) => (
								<div key={idx} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '10px', background: '#fafafa' }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<div>
											<h4>{template}</h4>
											<p style={{ margin: '0', color: '#666' }}>Version 1.0 • Last modified: 2 days ago</p>
										</div>
										<div>
											<button style={{ padding: '4px 8px', marginRight: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
											<button style={{ padding: '4px 8px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lock Version</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
		</div>
	);
}

