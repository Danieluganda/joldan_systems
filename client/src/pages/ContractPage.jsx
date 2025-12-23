import React, { useState } from 'react';

export default function ContractPage() {
	const [contracts, setContracts] = useState([]);
	const [supplierName, setSupplierName] = useState('');
	const [contractValue, setContractValue] = useState('');
	const [uploadFile, setUploadFile] = useState(null);

	const handleUploadContract = async (e) => {
		e.preventDefault();
		if (!supplierName.trim() || !contractValue || !uploadFile) return;

		const formData = new FormData();
		formData.append('supplier', supplierName);
		formData.append('value', contractValue);
		formData.append('file', uploadFile);

		try {
			const response = await fetch('/api/contracts', {
				method: 'POST',
				body: formData
			});
			if (response.ok) {
				setSupplierName('');
				setContractValue('');
				setUploadFile(null);
				window.location.reload();
			}
		} catch (error) {
			console.error('Error uploading contract:', error);
		}
	};

	const mockContracts = [
		{ id: 1, supplier: 'Tech Solutions', value: 48000, status: 'Active', signedDate: '2025-01-05', expiryDate: '2026-01-05', version: '1.0' },
		{ id: 2, supplier: 'ABC Suppliers', value: 50000, status: 'Draft', signedDate: null, expiryDate: null, version: '0.9' },
		{ id: 3, supplier: 'Global Traders', value: 52000, status: 'Pending Review', signedDate: null, expiryDate: null, version: '1.0' }
	];

	return (
		<div style={{ padding: '30px' }}>
					<h1>📄 Contracts</h1>
					<p>Link awarded contracts to procurement records and store versioned documents.</p>

					<section style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
						<h3>Upload New Contract</h3>
						<form onSubmit={handleUploadContract}>
							<div style={{ marginBottom: '15px' }}>
								<label>Supplier Name:</label>
								<input
									type="text"
									placeholder="Supplier name"
									value={supplierName}
									onChange={(e) => setSupplierName(e.target.value)}
									style={{ padding: '8px', width: '100%', maxWidth: '400px', marginTop: '5px' }}
								/>
							</div>
							<div style={{ marginBottom: '15px' }}>
								<label>Contract Value ($):</label>
								<input
									type="number"
									placeholder="50000"
									value={contractValue}
									onChange={(e) => setContractValue(e.target.value)}
									style={{ padding: '8px', width: '100%', maxWidth: '400px', marginTop: '5px' }}
								/>
							</div>
							<div style={{ marginBottom: '15px' }}>
								<label>Contract Document:</label>
								<input
									type="file"
									accept=".pdf,.doc,.docx"
									onChange={(e) => setUploadFile(e.target.files[0])}
									style={{ marginTop: '5px' }}
								/>
							</div>
							<button type="submit" disabled={!supplierName || !contractValue || !uploadFile} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: !supplierName || !contractValue || !uploadFile ? 0.5 : 1 }}>
								Upload Contract
							</button>
						</form>
					</section>

					<section style={{ marginTop: '30px' }}>
						<h3>Contract Registry</h3>
						<table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
							<thead>
								<tr style={{ background: '#f5f5f5' }}>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Supplier</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Value</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Version</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Signed</th>
									<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{mockContracts.map((contract) => (
									<tr key={contract.id} style={{ borderBottom: '1px solid #ddd' }}>
										<td style={{ padding: '10px' }}>{contract.supplier}</td>
										<td style={{ padding: '10px' }}>${contract.value.toLocaleString()}</td>
										<td style={{ padding: '10px' }}>{contract.version}</td>
										<td style={{ padding: '10px' }}>
											<span style={{ background: contract.status === 'Active' ? '#d4edda' : contract.status === 'Draft' ? '#fff3cd' : '#e7d4f5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
												{contract.status}
											</span>
										</td>
										<td style={{ padding: '10px' }}>{contract.signedDate || '—'}</td>
										<td style={{ padding: '10px' }}>
											<button style={{ padding: '4px 8px', marginRight: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>View</button>
											<button style={{ padding: '4px 8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>History</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
		</div>
	);
}
