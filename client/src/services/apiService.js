// client/src/services/apiService.js
// Simple API service for fetching backend data

export async function fetchApprovals() {
  // Replace with your actual backend endpoint for approvals
  const res = await fetch('/api/approvals');
  if (!res.ok) throw new Error('Failed to fetch approvals');
  return res.json();
}

export async function fetchApprovalTrail() {
  // Replace with your actual backend endpoint for approval trail
  const res = await fetch('/api/approvals/trail');
  if (!res.ok) throw new Error('Failed to fetch approval trail');
  return res.json();
}
