// client/src/pages/ApprovalPage.jsx



import React, { useState } from 'react';
import ApprovalQueue from '../components/approval/ApprovalQueue';
import ApprovalTrail from '../components/approval/ApprovalTrail';
import ApprovalHistory from '../components/approval/ApprovalHistory';
import ApprovalStatus from '../components/approval/ApprovalStatus';
import ApprovalCard from '../components/approval/ApprovalCard';


function navBtnStyle(active) {
	return {
		padding: '10px 18px',
		fontSize: 15,
		fontWeight: 600,
		border: 'none',
		borderRadius: 6,
		background: active ? '#007bff' : '#e9ecef',
		color: active ? 'white' : '#212529',
		cursor: 'pointer',
		boxShadow: active ? '0 2px 8px #007bff22' : undefined,
		transition: 'background 0.2s',
	};
}

function ApprovalPage() {
	// For demo, use a static procurementId
	const [view, setView] = useState('queue');
	const [selectedApproval, setSelectedApproval] = useState(null);
	const procurementId = 'PROC-2025-001';

	// Show ApprovalTrail for a selected approval, else show the main views
	return (
		<div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
			<h1 style={{ marginBottom: 8 }}>Approvals</h1>
			<div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
				<button onClick={() => { setView('queue'); setSelectedApproval(null); }} style={navBtnStyle(view === 'queue')}>Approval Queue</button>
				<button onClick={() => { setView('trail'); setSelectedApproval(null); }} style={navBtnStyle(view === 'trail')}>Approval Trail</button>
				<button onClick={() => { setView('history'); setSelectedApproval(null); }} style={navBtnStyle(view === 'history')}>Approval History</button>
				<button onClick={() => { setView('status'); setSelectedApproval(null); }} style={navBtnStyle(view === 'status')}>Workflow Status</button>
			</div>

			{/* Approval Queue: select an approval to see its trail */}
			{view === 'queue' && !selectedApproval && (
				<ApprovalQueue
					onApprovalSelect={approval => {
						setSelectedApproval(approval);
						setView('trail');
					}}
				/>
			)}

			{/* Approval Trail for selected approval, or general trail */}
			{view === 'trail' && (
				selectedApproval ? (
					<div>
						<button onClick={() => setSelectedApproval(null)} style={{ marginBottom: 16 }}>&larr; Back to Queue</button>
						<ApprovalTrail procurementId={selectedApproval.procurementId || procurementId} onClose={() => setSelectedApproval(null)} />
					</div>
				) : (
					<ApprovalTrail procurementId={procurementId} onClose={() => setView('queue')} />
				)
			)}

			{/* Approval History: select an approval to see its details */}
			{view === 'history' && (
				selectedApproval ? (
					<div>
						<button onClick={() => setSelectedApproval(null)} style={{ marginBottom: 16 }}>&larr; Back to History</button>
						<ApprovalCard approval={selectedApproval} readOnly />
					</div>
				) : (
					<ApprovalHistory procurementId={procurementId} onApprovalSelect={setSelectedApproval} />
				)
			)}

			{/* Workflow Status */}
			{view === 'status' && (
				<ApprovalStatus procurementId={procurementId} />
			)}
		</div>
	);
}

export default ApprovalPage;
