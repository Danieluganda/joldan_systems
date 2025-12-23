import React, { useState } from 'react';

const AuditPackGenerator = ({ procurementId, onGenerate, onCancel }) => {
  const [selectedSections, setSelectedSections] = useState({
    overview: true,
    rfq: true,
    evaluation: true,
    approvals: true,
    auditTrail: true,
    compliance: true,
    riskAssessment: true,
    financialSummary: true,
  });

  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [packFormat, setPackFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

  const sections = [
    {
      key: 'overview',
      label: 'Procurement Overview',
      description: 'Executive summary with key metrics',
      pages: 3,
      required: true,
    },
    {
      key: 'rfq',
      label: 'RFQ Documentation',
      description: 'Terms, conditions, and technical requirements',
      pages: 8,
      required: true,
    },
    {
      key: 'evaluation',
      label: 'Bid Evaluation Details',
      description: 'Scoring matrix and evaluator comments',
      pages: 6,
      required: false,
    },
    {
      key: 'approvals',
      label: 'Approval Chain',
      description: 'All approval records and signatures',
      pages: 4,
      required: false,
    },
    {
      key: 'auditTrail',
      label: 'Audit Trail Log',
      description: 'Complete activity log with timestamps',
      pages: 5,
      required: false,
    },
    {
      key: 'compliance',
      label: 'Compliance Checklist',
      description: 'PPDA 2005 compliance verification',
      pages: 3,
      required: false,
    },
    {
      key: 'riskAssessment',
      label: 'Risk Assessment',
      description: 'Identified risks and mitigation strategies',
      pages: 4,
      required: false,
    },
    {
      key: 'financialSummary',
      label: 'Financial Summary',
      description: 'Budget analysis and cost breakdown',
      pages: 3,
      required: false,
    },
  ];

  const handleSectionToggle = (key) => {
    if (!sections.find(s => s.key === key)?.required) {
      setSelectedSections(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleSelectAll = () => {
    const newSelection = {};
    sections.forEach(s => {
      newSelection[s.key] = true;
    });
    setSelectedSections(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection = {};
    sections.forEach(s => {
      newSelection[s.key] = s.required;
    });
    setSelectedSections(newSelection);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const config = {
        procurementId,
        sections: Object.keys(selectedSections).filter(key => selectedSections[key]),
        includeAttachments,
        format: packFormat,
        generatedAt: new Date().toISOString(),
      };
      console.log('Generating audit pack with config:', config);
      if (onGenerate) {
        await onGenerate(config);
      }
    } catch (err) {
      alert('Failed to generate audit pack');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCount = Object.values(selectedSections).filter(v => v).length;
  const totalPages = sections
    .filter(s => selectedSections[s.key])
    .reduce((sum, s) => sum + s.pages, 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Generate Audit Pack</h2>
        <p style={styles.subtitle}>Procurement ID: {procurementId}</p>
      </div>

      {/* Format Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Output Format</h3>
        <div style={styles.formatGrid}>
          {[
            { id: 'pdf', label: '📄 PDF', desc: 'Single PDF document (recommended)' },
            { id: 'word', label: '📝 Word', desc: 'Microsoft Word format' },
            { id: 'excel', label: '📊 Excel', desc: 'Spreadsheet format for data' },
            { id: 'html', label: '🌐 HTML', desc: 'Web-ready HTML package' },
          ].map(format => (
            <div
              key={format.id}
              style={{
                ...styles.formatOption,
                backgroundColor: packFormat === format.id ? '#e7f3ff' : '#f8f9fa',
                borderColor: packFormat === format.id ? '#007bff' : '#dee2e6',
              }}
              onClick={() => setPackFormat(format.id)}
            >
              <input type="radio" checked={packFormat === format.id} readOnly style={styles.radio} />
              <div>
                <div style={styles.formatLabel}>{format.label}</div>
                <div style={styles.formatDesc}>{format.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections Selection */}
      <div style={styles.section}>
        <div style={styles.sectionsHeader}>
          <h3 style={styles.sectionTitle}>Report Sections</h3>
          <div style={styles.sectionControls}>
            <button onClick={handleSelectAll} style={styles.controlBtn}>Select All</button>
            <button onClick={handleDeselectAll} style={styles.controlBtn}>Reset</button>
          </div>
        </div>

        <div style={styles.sectionsList}>
          {sections.map(section => (
            <div
              key={section.key}
              style={{
                ...styles.sectionOption,
                backgroundColor: selectedSections[section.key] ? '#f0f8f5' : '#f8f9fa',
                borderColor: selectedSections[section.key] ? '#28a745' : '#dee2e6',
              }}
            >
              <input
                type="checkbox"
                checked={selectedSections[section.key]}
                onChange={() => handleSectionToggle(section.key)}
                disabled={section.required}
                style={styles.checkbox}
              />
              <div style={styles.sectionDetail}>
                <div style={styles.sectionName}>{section.label}</div>
                <div style={styles.sectionHint}>{section.description}</div>
              </div>
              <div style={styles.pageInfo}>
                <span style={styles.pages}>{section.pages} pages</span>
                {section.required && <span style={styles.required}>Required</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.summary}>
          <span style={styles.summaryText}>
            {selectedCount} sections selected • ~{totalPages} pages
          </span>
        </div>
      </div>

      {/* Additional Options */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Additional Options</h3>

        <div style={styles.optionRow}>
          <input
            type="checkbox"
            checked={includeAttachments}
            onChange={(e) => setIncludeAttachments(e.target.checked)}
            style={styles.checkbox}
          />
          <div>
            <div style={styles.optionLabel}>Include Supporting Documents</div>
            <div style={styles.optionDesc}>Attach RFQ documents, bid submissions, and evaluation files</div>
          </div>
        </div>
      </div>

      {/* Preview Information */}
      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>📋 Pack Contents Summary</h4>
        <ul style={styles.infoList}>
          <li>Total Sections: {selectedCount}</li>
          <li>Estimated Pages: ~{totalPages}</li>
          <li>Format: {packFormat.toUpperCase()}</li>
          <li>Attachments: {includeAttachments ? 'Included' : 'Excluded'}</li>
          <li>Generation Time: ~2-5 minutes</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || selectedCount === 0}
          style={{
            ...styles.button,
            ...styles.generateBtn,
            opacity: isGenerating || selectedCount === 0 ? 0.6 : 1,
            cursor: isGenerating || selectedCount === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isGenerating ? '⏳ Generating...' : '📥 Generate Audit Pack'}
        </button>
        <button
          onClick={onCancel}
          disabled={isGenerating}
          style={{ ...styles.button, ...styles.cancelBtn }}
        >
          Cancel
        </button>
      </div>

      {/* Information Message */}
      <div style={styles.messageBox}>
        <p style={styles.messageText}>
          ℹ️ The audit pack will be generated in the background. You'll receive a notification when it's ready for download.
          Large packs may take several minutes to complete.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '800px',
  },
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e9ecef',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: '0 0 16px 0',
  },
  sectionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionControls: {
    display: 'flex',
    gap: '8px',
  },
  controlBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#e9ecef',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  formatOption: {
    padding: '12px',
    borderRadius: '6px',
    border: '2px solid',
    cursor: 'pointer',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    transition: 'all 0.2s ease',
  },
  radio: {
    marginTop: '2px',
    cursor: 'pointer',
  },
  formatLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
  },
  formatDesc: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
  },
  sectionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  sectionOption: {
    padding: '12px',
    borderRadius: '6px',
    border: '2px solid',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    transition: 'all 0.2s ease',
  },
  checkbox: {
    marginTop: '2px',
    cursor: 'pointer',
  },
  sectionDetail: {
    flex: 1,
  },
  sectionName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
  },
  sectionHint: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '2px',
  },
  pageInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  pages: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#495057',
  },
  required: {
    fontSize: '11px',
    backgroundColor: '#e9ecef',
    padding: '2px 6px',
    borderRadius: '3px',
    color: '#6c757d',
  },
  summary: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  },
  summaryText: {
    fontSize: '13px',
    color: '#6c757d',
    fontWeight: '500',
  },
  optionRow: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  optionLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#212529',
  },
  optionDesc: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '2px',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    border: '1px solid #b3d9ff',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '24px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#004085',
    margin: '0 0 12px 0',
  },
  infoList: {
    fontSize: '13px',
    color: '#004085',
    margin: '0',
    paddingLeft: '20px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  generateBtn: {
    flex: 1,
    backgroundColor: '#28a745',
    color: 'white',
  },
  cancelBtn: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  messageBox: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    padding: '12px',
    color: '#856404',
  },
  messageText: {
    fontSize: '13px',
    margin: '0',
    lineHeight: '1.4',
  },
};

export default AuditPackGenerator;
