import React, { useState, useEffect } from 'react';
import './audit.css';

/**
 * ComplianceChecklist Component
 * 
 * Displays a comprehensive checklist of PPDA compliance requirements and
 * tracks completion status. Provides visual feedback on compliance progress.
 * 
 * Features:
 * - PPDA requirement tracking
 * - Item completion toggle
 * - Progress percentage calculation
 * - Color-coded status indicators
 * - Category-based organization
 * - Export/print functionality
 */

const ComplianceChecklist = ({ procurementId = null, onChecklistChange = null, readOnly = false }) => {
  const [checklist, setChecklist] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({
    documentation: true,
    process: true,
    transparency: true,
    records: true
  });
  const [filterStatus, setFilterStatus] = useState('all'); // all, complete, incomplete

  // Initialize compliance checklist with PPDA requirements
  useEffect(() => {
    const defaultChecklist = [
      // Documentation Category
      {
        id: 'doc_001',
        category: 'documentation',
        categoryLabel: 'Documentation Requirements',
        item: 'Procurement plan documented and approved',
        completed: false,
        required: true,
        description: 'Formal procurement plan with timelines and budget'
      },
      {
        id: 'doc_002',
        category: 'documentation',
        categoryLabel: 'Documentation Requirements',
        item: 'Procurement method justification documented',
        completed: false,
        required: true,
        description: 'Written explanation for method selection (open bid, restricted, etc.)'
      },
      {
        id: 'doc_003',
        category: 'documentation',
        categoryLabel: 'Documentation Requirements',
        item: 'RFQ/evaluation criteria documented',
        completed: false,
        required: true,
        description: 'Clear evaluation criteria and weighting provided to bidders'
      },
      {
        id: 'doc_004',
        category: 'documentation',
        categoryLabel: 'Documentation Requirements',
        item: 'Bid evaluation report prepared',
        completed: false,
        required: true,
        description: 'Detailed analysis of all bids against criteria'
      },
      {
        id: 'doc_005',
        category: 'documentation',
        categoryLabel: 'Documentation Requirements',
        item: 'Award decision documented',
        completed: false,
        required: true,
        description: 'Written justification for winning bid selection'
      },

      // Process Category
      {
        id: 'proc_001',
        category: 'process',
        categoryLabel: 'Process Compliance',
        item: 'Competitive bidding process followed',
        completed: false,
        required: true,
        description: 'Multiple bids solicited and evaluated objectively'
      },
      {
        id: 'proc_002',
        category: 'process',
        categoryLabel: 'Process Compliance',
        item: 'Evaluation committee members declared conflicts',
        completed: false,
        required: true,
        description: 'All conflicts of interest identified and documented'
      },
      {
        id: 'proc_003',
        category: 'process',
        categoryLabel: 'Process Compliance',
        item: 'Bid clarification process used (if needed)',
        completed: false,
        required: false,
        description: 'Bidders given opportunity to clarify submissions'
      },
      {
        id: 'proc_004',
        category: 'process',
        categoryLabel: 'Process Compliance',
        item: 'Negotiation documented (if applicable)',
        completed: false,
        required: false,
        description: 'Any price/term negotiations recorded with justification'
      },
      {
        id: 'proc_005',
        category: 'process',
        categoryLabel: 'Process Compliance',
        item: 'Deviations from plan approved',
        completed: false,
        required: false,
        description: 'Any changes to procurement plan formally approved'
      },

      // Transparency Category
      {
        id: 'trans_001',
        category: 'transparency',
        categoryLabel: 'Transparency & Disclosure',
        item: 'Bid results announced publicly',
        completed: false,
        required: true,
        description: 'Award announcement made available to public/stakeholders'
      },
      {
        id: 'trans_002',
        category: 'transparency',
        categoryLabel: 'Transparency & Disclosure',
        item: 'Unsuccessful bidders notified',
        completed: false,
        required: true,
        description: 'Failed bidders informed of decision and reason'
      },
      {
        id: 'trans_003',
        category: 'transparency',
        categoryLabel: 'Transparency & Disclosure',
        item: 'Appeal process documented',
        completed: false,
        required: true,
        description: 'Bidders informed of right to appeal and process'
      },
      {
        id: 'trans_004',
        category: 'transparency',
        categoryLabel: 'Transparency & Disclosure',
        item: 'Media/observer access provided',
        completed: false,
        required: false,
        description: 'Media or observers allowed to attend process events'
      },

      // Records Category
      {
        id: 'rec_001',
        category: 'records',
        categoryLabel: 'Records & Audit Trail',
        item: 'All bids securely stored',
        completed: false,
        required: true,
        description: 'Original bid documents preserved and protected'
      },
      {
        id: 'rec_002',
        category: 'records',
        categoryLabel: 'Records & Audit Trail',
        item: 'Meeting minutes documented',
        completed: false,
        required: true,
        description: 'Evaluation meetings recorded with attendance and decisions'
      },
      {
        id: 'rec_003',
        category: 'records',
        categoryLabel: 'Records & Audit Trail',
        item: 'Communication logs maintained',
        completed: false,
        required: true,
        description: 'All communications with bidders documented'
      },
      {
        id: 'rec_004',
        category: 'records',
        categoryLabel: 'Records & Audit Trail',
        item: 'Version control on documents',
        completed: false,
        required: true,
        description: 'Document changes tracked with dates and authors'
      },
      {
        id: 'rec_005',
        category: 'records',
        categoryLabel: 'Records & Audit Trail',
        item: 'Contract file complete',
        completed: false,
        required: true,
        description: 'All contract documents filed with procurement records'
      }
    ];

    setChecklist(defaultChecklist);
  }, []);

  // Handle checkbox toggle
  const handleToggleItem = (itemId) => {
    if (readOnly) return;

    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    setChecklist(updatedChecklist);

    // Notify parent component of changes
    if (onChecklistChange) {
      onChecklistChange(updatedChecklist);
    }
  };

  // Toggle category expansion
  const handleToggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Calculate completion stats
  const getStats = () => {
    const total = checklist.length;
    const completed = checklist.filter(item => item.completed).length;
    const required = checklist.filter(item => item.required).length;
    const requiredCompleted = checklist.filter(item => item.required && item.completed).length;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      required,
      requiredCompleted,
      requiredPercentage: required > 0 ? Math.round((requiredCompleted / required) * 100) : 0
    };
  };

  // Get filtered items
  const getFilteredItems = (category) => {
    return checklist
      .filter(item => item.category === category)
      .filter(item => {
        if (filterStatus === 'complete') return item.completed;
        if (filterStatus === 'incomplete') return !item.completed;
        return true;
      });
  };

  const stats = getStats();
  const categories = ['documentation', 'process', 'transparency', 'records'];

  // Get status color
  const getStatusColor = (percentage) => {
    if (percentage === 100) return '#27ae60'; // Green
    if (percentage >= 75) return '#f39c12'; // Orange
    if (percentage >= 50) return '#e67e22'; // Dark orange
    return '#e74c3c'; // Red
  };

  // Export checklist
  const handleExport = () => {
    const csvData = [
      ['Compliance Checklist Report'],
      [`Date: ${new Date().toLocaleDateString()}`],
      [`Procurement ID: ${procurementId || 'N/A'}`],
      [],
      ['Item', 'Category', 'Status', 'Required'],
      ...checklist.map(item => [
        item.item,
        item.categoryLabel,
        item.completed ? 'Complete' : 'Incomplete',
        item.required ? 'Yes' : 'No'
      ]),
      [],
      ['Summary'],
      [`Total Items: ${stats.total}`],
      [`Completed: ${stats.completed}`],
      [`Completion: ${stats.percentage}%`],
      [`Required Completion: ${stats.requiredPercentage}%`]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-checklist-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Print checklist
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Compliance Checklist</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .summary { margin: 20px 0; padding: 10px; background: #f5f5f5; }
          .category { margin: 20px 0; page-break-inside: avoid; }
          .category-title { background: #3498db; color: white; padding: 10px; font-weight: bold; }
          .item { margin: 10px 0; padding: 10px; border-left: 3px solid #ddd; }
          .item.completed { background: #f0fff0; border-left-color: #27ae60; }
          .item.incomplete { background: #fff5f5; border-left-color: #e74c3c; }
          .checkbox { margin-right: 10px; }
          .required { color: #e74c3c; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>PPDA Compliance Checklist</h1>
        <div class="summary">
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Procurement ID:</strong> ${procurementId || 'N/A'}</p>
          <p><strong>Overall Completion:</strong> ${stats.percentage}%</p>
          <p><strong>Required Items Completion:</strong> ${stats.requiredPercentage}%</p>
        </div>
        ${categories.map(cat => {
          const items = getFilteredItems(cat);
          if (items.length === 0) return '';
          const catLabel = items[0].categoryLabel;
          return `
            <div class="category">
              <div class="category-title">${catLabel}</div>
              ${items.map(item => `
                <div class="item ${item.completed ? 'completed' : 'incomplete'}">
                  <input type="checkbox" ${item.completed ? 'checked' : ''} disabled class="checkbox" />
                  <strong>${item.item}</strong>
                  ${item.required ? '<span class="required"> (Required)</span>' : ''}
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">${item.description}</p>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="compliance-checklist">
      <div className="checklist-header">
        <h2>PPDA Compliance Checklist</h2>
        {procurementId && <p className="procurement-id">Procurement ID: {procurementId}</p>}
      </div>

      {/* Overall Progress */}
      <div className="checklist-progress">
        <div className="progress-stat">
          <div className="stat-label">Overall Completion</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{
                width: `${stats.percentage}%`,
                backgroundColor: getStatusColor(stats.percentage)
              }}
            />
          </div>
          <div className="stat-value">{stats.completed}/{stats.total} ({stats.percentage}%)</div>
        </div>

        <div className="progress-stat">
          <div className="stat-label">Required Items</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{
                width: `${stats.requiredPercentage}%`,
                backgroundColor: stats.requiredPercentage === 100 ? '#27ae60' : '#e74c3c'
              }}
            />
          </div>
          <div className="stat-value">{stats.requiredCompleted}/{stats.required} ({stats.requiredPercentage}%)</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="checklist-controls">
        <div className="filter-group">
          <label>Filter:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Items</option>
            <option value="complete">Completed Only</option>
            <option value="incomplete">Incomplete Only</option>
          </select>
        </div>

        <div className="action-buttons">
          {!readOnly && <button onClick={handlePrint} className="btn-print">🖨️ Print</button>}
          <button onClick={handleExport} className="btn-export">📥 Export CSV</button>
        </div>
      </div>

      {/* Categories with Items */}
      <div className="checklist-categories">
        {categories.map(categoryKey => {
          const items = getFilteredItems(categoryKey);
          const categoryLabel = items.length > 0 ? items[0].categoryLabel : '';
          const categoryCompleted = checklist
            .filter(item => item.category === categoryKey)
            .filter(item => item.completed).length;
          const categoryTotal = checklist
            .filter(item => item.category === categoryKey).length;

          return (
            <div key={categoryKey} className="category-section">
              <div 
                className="category-header"
                onClick={() => handleToggleCategory(categoryKey)}
              >
                <span className="category-toggle">
                  {expandedCategories[categoryKey] ? '▼' : '▶'}
                </span>
                <span className="category-name">{categoryLabel}</span>
                <span className="category-progress">
                  {categoryCompleted}/{categoryTotal}
                </span>
              </div>

              {expandedCategories[categoryKey] && (
                <div className="category-items">
                  {items.length > 0 ? (
                    items.map(item => (
                      <div 
                        key={item.id} 
                        className={`checklist-item ${item.completed ? 'completed' : 'pending'}`}
                      >
                        <label className="item-checkbox">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleItem(item.id)}
                            disabled={readOnly}
                          />
                          <span className="checkmark"></span>
                        </label>
                        <div className="item-content">
                          <div className="item-title">
                            {item.item}
                            {item.required && <span className="badge-required">Required</span>}
                          </div>
                          <div className="item-description">{item.description}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-items">No items in this category</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="checklist-footer">
        <div className="footer-stat">
          <span className="stat-icon">✓</span>
          <span className="stat-text">Completed: {stats.completed}/{stats.total}</span>
        </div>
        <div className="footer-stat">
          <span className="stat-icon">⚠</span>
          <span className="stat-text">Required: {stats.requiredCompleted}/{stats.required}</span>
        </div>
        <div className="footer-stat">
          <span className="stat-icon">📊</span>
          <span className="stat-text">Status: {stats.percentage === 100 ? '✓ Compliant' : '⚠ Incomplete'}</span>
        </div>
      </div>

      {readOnly && (
        <div className="read-only-notice">
          This checklist is in read-only mode
        </div>
      )}
    </div>
  );
};

export default ComplianceChecklist;
