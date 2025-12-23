import React, { useState } from 'react';

export default function ClarificationsPage() {
	const [questions, setQuestions] = useState([]);
	const [newQuestion, setNewQuestion] = useState('');
	const [newAnswer, setNewAnswer] = useState('');
	const [filter, setFilter] = useState('all');

	const handleAddClarification = async (e) => {
		e.preventDefault();
		if (!newQuestion.trim()) return;

		try {
			const response = await fetch('/api/clarifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: newQuestion, answer: newAnswer || null })
			});
			if (response.ok) {
				setNewQuestion('');
				setNewAnswer('');
				window.location.reload();
			}
		} catch (error) {
			console.error('Error adding clarification:', error);
		}
	};

	const mockQuestions = [
		{ id: 1, supplier: 'ABC Suppliers', question: 'What is the minimum order quantity?', answer: 'Minimum order is 100 units.', status: 'answered' },
		{ id: 2, supplier: 'XYZ Ltd', question: 'Are there volume discounts?', answer: null, status: 'unanswered' },
		{ id: 3, supplier: 'Tech Corp', question: 'What payment terms are available?', answer: 'Net 30 from invoice date.', status: 'answered' }
	];

	const filteredQuestions = mockQuestions.filter(q => {
		if (filter === 'unanswered') return q.status === 'unanswered';
		if (filter === 'answered') return q.status === 'answered';
		return true;
	});

	return (
		<div style={{ padding: '30px' }}>
					<h1>❓ Clarifications & Q&A</h1>
					<p>Manage questions from suppliers, publish clarifications, and maintain a Q&A log linked to RFQs.</p>

					<section style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
						<h3>Add New Clarification</h3>
						<form onSubmit={handleAddClarification}>
							<div style={{ marginBottom: '15px' }}>
								<label>Question:</label>
								<textarea
									placeholder="Enter supplier question here..."
									value={newQuestion}
									onChange={(e) => setNewQuestion(e.target.value)}
									style={{ padding: '8px', width: '100%', minHeight: '80px', marginTop: '5px', fontFamily: 'inherit' }}
								/>
							</div>
							<div style={{ marginBottom: '15px' }}>
								<label>Answer (Optional):</label>
								<textarea
									placeholder="Enter clarification/answer here..."
									value={newAnswer}
									onChange={(e) => setNewAnswer(e.target.value)}
									style={{ padding: '8px', width: '100%', minHeight: '80px', marginTop: '5px', fontFamily: 'inherit' }}
								/>
							</div>
							<button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
								Publish Clarification
							</button>
						</form>
					</section>

					<section style={{ marginTop: '30px' }}>
						<div style={{ marginBottom: '15px' }}>
							<label>Filter: </label>
							<select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px', marginLeft: '10px' }}>
								<option value="all">All Questions</option>
								<option value="unanswered">Unanswered</option>
								<option value="answered">Answered</option>
							</select>
						</div>

						<h3>Q&A Log ({filteredQuestions.length})</h3>
						{filteredQuestions.length === 0 ? (
							<p>No questions in this category.</p>
						) : (
							<div style={{ marginTop: '20px' }}>
								{filteredQuestions.map((q) => (
									<div key={q.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '10px', background: '#fafafa' }}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
											<div style={{ flex: 1 }}>
												<p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>From: {q.supplier}</p>
												<p style={{ margin: '0 0 10px 0' }}><strong>Q:</strong> {q.question}</p>
												{q.answer && <p style={{ margin: '0', color: '#006600' }}><strong>A:</strong> {q.answer}</p>}
											</div>
											<span style={{ background: q.status === 'answered' ? '#d4edda' : '#fff3cd', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
												{q.status === 'answered' ? '✓ Answered' : '⏳ Pending'}
											</span>
										</div>
									</div>
								))}
							</div>
						)}
					</section>
		</div>
	);
}

