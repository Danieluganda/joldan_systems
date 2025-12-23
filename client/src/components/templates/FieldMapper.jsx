import React, { useState } from 'react';
import './templates.css';

/**
 * FieldMapper Component
 * 
 * Allows mapping of template fields to actual procurement data.
 * Provides drag-and-drop or select-based field mapping.
 * 
 * Features:
 * - Visual field mapping interface
 * - Template field listing
 * - Data field selector
 * - Mapping validation
 * - Preview of mapped data
 * - Save/export mappings
 */

const FieldMapper = ({
  templateId = null,
  templateFields = [],
  dataFields = [],
  onMappingsChange = null,
  readOnly = false
}) => {
  const [mappings, setMappings] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    template: true,
    data: true,
    mappings: true
  });
  const [validationErrors, setValidationErrors] = useState([]);

  // Default template and data fields if not provided
  const defaultTemplateFields = [
    { id: 'procurementName', label: 'Procurement Name', type: 'text', required: true },
    { id: 'procurementDesc', label: 'Procurement Description', type: 'textarea', required: true },
    { id: 'budget', label: 'Budget Amount', type: 'number', required: true },
    { id: 'timeline', label: 'Timeline (Days)', type: 'number', required: true },
    { id: 'evaluationCriteria', label: 'Evaluation Criteria', type: 'text', required: true },
    { id: 'weightedScores', label: 'Weighted Scores', type: 'text', required: false },
    { id: 'minimumRequirements', label: 'Minimum Requirements', type: 'textarea', required: false },
    { id: 'bidders', label: 'Bidder Information', type: 'text', required: false }
  ];

  const defaultDataFields = [
    { id: 'data_name', label: 'Procurement Name', type: 'text' },
    { id: 'data_desc', label: 'Description', type: 'textarea' },
    { id: 'data_budget', label: 'Total Budget', type: 'number' },
    { id: 'data_deadline', label: 'Submission Deadline', type: 'date' },
    { id: 'data_criteria', label: 'Selection Criteria', type: 'text' },
    { id: 'data_requirements', label: 'Technical Requirements', type: 'textarea' },
    { id: 'data_suppliers', label: 'Supplier List', type: 'text' }
  ];

  const useTemplateFields = templateFields.length > 0 ? templateFields : defaultTemplateFields;
  const useDataFields = dataFields.length > 0 ? dataFields : defaultDataFields;

  // Handle field mapping
  const handleMapField = (templateFieldId, dataFieldId) => {
    if (readOnly) return;

    const newMappings = { ...mappings };

    if (dataFieldId === null || dataFieldId === '') {
      delete newMappings[templateFieldId];
    } else {
      newMappings[templateFieldId] = dataFieldId;
    }

    setMappings(newMappings);
    validateMappings(newMappings);

    if (onMappingsChange) {
      onMappingsChange(newMappings);
    }
  };

  // Validate mappings
  const validateMappings = (newMappings) => {
    const errors = [];

    // Check required fields are mapped
    useTemplateFields.forEach(field => {
      if (field.required && !newMappings[field.id]) {
        errors.push(`Required field "${field.label}" is not mapped`);
      }
    });

    // Check for duplicate mappings
    const mappedValues = Object.values(newMappings);
    const duplicates = mappedValues.filter((item, index) => mappedValues.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push(`Some data fields are mapped multiple times`);
    }

    setValidationErrors(errors);
  };

  // Get mapped field label
  const getMappedFieldLabel = (dataFieldId) => {
    const field = useDataFields.find(f => f.id === dataFieldId);
    return field ? field.label : 'Unknown';
  };

  // Get data field type
  const getDataFieldType = (dataFieldId) => {
    const field = useDataFields.find(f => f.id === dataFieldId);
    return field ? field.type : 'text';
  };

  // Clear all mappings
  const handleClearMappings = () => {
    setMappings({});
    setValidationErrors([]);
    if (onMappingsChange) onMappingsChange({});
  };

  // Auto-map fields (smart matching)
  const handleAutoMap = () => {
    if (readOnly) return;

    const newMappings = {};

    useTemplateFields.forEach(tField => {
      // Try to find matching data field by similar name
      const match = useDataFields.find(dField =>
        dField.label.toLowerCase().includes(tField.label.toLowerCase().split(' ')[0]) ||
        tField.label.toLowerCase().includes(dField.label.toLowerCase().split(' ')[0])
      );

      if (match && getDataFieldType(match.id) === tField.type) {
        newMappings[tField.id] = match.id;
      }
    });

    setMappings(newMappings);
    validateMappings(newMappings);
    if (onMappingsChange) onMappingsChange(newMappings);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const mappedCount = Object.keys(mappings).length;
  const requiredCount = useTemplateFields.filter(f => f.required).length;
  const isComplete = mappedCount >= requiredCount && validationErrors.length === 0;

  return (
    <div className="field-mapper">
      <div className="mapper-header">
        <h2>Field Mapper</h2>
        {templateId && <p className="mapper-template-id">Template: {templateId}</p>}
      </div>

      {/* Mapping Status */}
      <div className="mapper-status">
        <div className={`status-indicator ${isComplete ? 'complete' : 'incomplete'}`}>
          {isComplete ? '✓' : '⚠'}
        </div>
        <div className="status-info">
          <div className="status-text">
            {mappedCount}/{requiredCount} required fields mapped
          </div>
          {validationErrors.length > 0 && (
            <div className="status-errors">
              {validationErrors.map((error, idx) => (
                <div key={idx} className="error-item">❌ {error}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {!readOnly && (
        <div className="mapper-controls">
          <button className="btn-auto-map" onClick={handleAutoMap}>
            🤖 Auto-Map
          </button>
          <button className="btn-clear-map" onClick={handleClearMappings}>
            🗑️ Clear Mappings
          </button>
        </div>
      )}

      <div className="mapper-content">
        {/* Template Fields */}
        <div className="mapper-section template-section">
          <div
            className="section-header"
            onClick={() => toggleSection('template')}
          >
            <h3>📋 Template Fields</h3>
            <span className="section-toggle">
              {expandedSections.template ? '▼' : '▶'}
            </span>
          </div>

          {expandedSections.template && (
            <div className="section-content">
              {useTemplateFields.map(tField => (
                <div key={tField.id} className="template-field">
                  <div className="field-label">
                    {tField.label}
                    {tField.required && <span className="required-badge">*</span>}
                  </div>
                  <div className="field-type">{tField.type}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mapping Arrows */}
        <div className="mapper-arrows">
          <div className="arrow">→</div>
        </div>

        {/* Data Fields Selector */}
        <div className="mapper-section data-section">
          <div
            className="section-header"
            onClick={() => toggleSection('data')}
          >
            <h3>📊 Data Fields</h3>
            <span className="section-toggle">
              {expandedSections.data ? '▼' : '▶'}
            </span>
          </div>

          {expandedSections.data && (
            <div className="section-content">
              {useDataFields.map(dField => (
                <div key={dField.id} className="data-field">
                  <div className="field-label">{dField.label}</div>
                  <div className="field-type">{dField.type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mapping Details */}
      <div className="mapper-mappings">
        <div
          className="mappings-header"
          onClick={() => toggleSection('mappings')}
        >
          <h3>🔗 Field Mappings ({mappedCount})</h3>
          <span className="mappings-toggle">
            {expandedSections.mappings ? '▼' : '▶'}
          </span>
        </div>

        {expandedSections.mappings && (
          <div className="mappings-list">
            {useTemplateFields.map(tField => (
              <div key={tField.id} className="mapping-row">
                <div className="mapping-template">
                  <span className="field-name">{tField.label}</span>
                  {tField.required && <span className="required">Required</span>}
                </div>

                <div className="mapping-arrow">→</div>

                <div className="mapping-data">
                  {readOnly ? (
                    <span className="mapping-value">
                      {mappings[tField.id]
                        ? getMappedFieldLabel(mappings[tField.id])
                        : '(not mapped)'}
                    </span>
                  ) : (
                    <select
                      value={mappings[tField.id] || ''}
                      onChange={(e) => handleMapField(tField.id, e.target.value)}
                      className={`mapping-select ${mappings[tField.id] ? 'mapped' : 'unmapped'}`}
                    >
                      <option value="">-- Select field --</option>
                      {useDataFields.map(dField => (
                        <option
                          key={dField.id}
                          value={dField.id}
                          disabled={
                            Object.values(mappings).includes(dField.id) &&
                            mappings[tField.id] !== dField.id
                          }
                        >
                          {dField.label} ({dField.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}

            {mappedCount === 0 && (
              <div className="no-mappings">
                No fields mapped yet. Start mapping by selecting data fields above.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="mapper-preview">
        <h3>📸 Preview</h3>
        <div className="preview-content">
          <p>Mapped fields preview will be displayed here once fields are selected.</p>
          {mappedCount > 0 && (
            <div className="preview-summary">
              <p>✓ {mappedCount} field(s) successfully mapped</p>
              {validationErrors.length === 0 && (
                <p style={{ color: '#27ae60' }}>✓ All validations passed!</p>
              )}
            </div>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="read-only-notice">
          This mapper is in read-only mode
        </div>
      )}
    </div>
  );
};

export default FieldMapper;
