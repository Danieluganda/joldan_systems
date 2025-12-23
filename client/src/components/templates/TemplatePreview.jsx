import React, { useState, useEffect } from 'react';
import './templates.css';

/**
 * TemplatePreview Component
 * 
 * Displays a detailed preview of template structure and content.
 * Shows template metadata, sections, and sample data.
 * 
 * Features:
 * - Template structure visualization
 * - Section and field listing
 * - Sample data preview
 * - Field type indicators
 * - Required field highlighting
 * - Validation rules display
 */

const TemplatePreview = ({
  template = null,
  templateId = null,
  onClose = null,
  readOnly = true
}) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Default template for preview
  const defaultTemplate = {
    id: templateId || 'template_001',
    name: 'Standard Procurement Template',
    description: 'Standard template for general procurements',
    version: '1.0',
    createdDate: new Date(Date.now() - 30 * 24 * 60 * 60000),
    lastModified: new Date(Date.now() - 7 * 24 * 60 * 60000),
    status: 'Active',
    categories: [
      {
        id: 'basic_info',
        name: 'Basic Information',
        description: 'Basic procurement details',
        fields: [
          { id: 'name', label: 'Procurement Name', type: 'text', required: true, maxLength: 255 },
          { id: 'description', label: 'Description', type: 'textarea', required: true, minLength: 10 },
          { id: 'category', label: 'Category', type: 'select', required: true, options: ['Goods', 'Services', 'Works'] }
        ]
      },
      {
        id: 'financial',
        name: 'Financial Information',
        description: 'Budget and cost details',
        fields: [
          { id: 'estimatedBudget', label: 'Estimated Budget', type: 'number', required: true, min: 0 },
          { id: 'currency', label: 'Currency', type: 'select', required: true, options: ['USD', 'EUR', 'GBP'] },
          { id: 'contingency', label: 'Contingency (%)', type: 'number', required: false, min: 0, max: 100 }
        ]
      },
      {
        id: 'evaluation',
        name: 'Evaluation Criteria',
        description: 'How bids will be evaluated',
        fields: [
          { id: 'criteria', label: 'Evaluation Criteria', type: 'textarea', required: true },
          { id: 'weightPrice', label: 'Price Weight (%)', type: 'number', required: true, min: 0, max: 100 },
          { id: 'weightQuality', label: 'Quality Weight (%)', type: 'number', required: true, min: 0, max: 100 },
          { id: 'minimumScore', label: 'Minimum Score', type: 'number', required: false, min: 0, max: 100 }
        ]
      },
      {
        id: 'timeline',
        name: 'Timeline',
        description: 'Procurement schedule',
        fields: [
          { id: 'publishDate', label: 'Publication Date', type: 'date', required: true },
          { id: 'submissionDeadline', label: 'Submission Deadline', type: 'date', required: true },
          { id: 'evaluationPeriod', label: 'Evaluation Period (days)', type: 'number', required: true, min: 1 },
          { id: 'awardDate', label: 'Expected Award Date', type: 'date', required: false }
        ]
      }
    ]
  };

  const displayTemplate = template || defaultTemplate;

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Get field icon based on type
  const getFieldIcon = (type) => {
    const icons = {
      text: '📝',
      textarea: '📄',
      number: '🔢',
      date: '📅',
      select: '📋',
      checkbox: '✓',
      file: '📎'
    };
    return icons[type] || '📋';
  };

  // Count statistics
  const totalFields = displayTemplate.categories.reduce((sum, cat) => sum + cat.fields.length, 0);
  const requiredFields = displayTemplate.categories.reduce(
    (sum, cat) => sum + cat.fields.filter(f => f.required).length,
    0
  );

  return (
    <div className="template-preview">
      {/* Header */}
      <div className="preview-header">
        <div className="header-content">
          <h2>{displayTemplate.name}</h2>
          <p className="template-description">{displayTemplate.description}</p>
          <div className="template-meta">
            <span className={`status-badge ${displayTemplate.status.toLowerCase()}`}>
              {displayTemplate.status}
            </span>
            <span className="version">v{displayTemplate.version}</span>
            <span className="id">ID: {displayTemplate.id}</span>
          </div>
        </div>

        {onClose && (
          <button className="close-preview" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="preview-stats">
        <div className="stat">
          <span className="stat-label">Total Fields</span>
          <span className="stat-value">{totalFields}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Required</span>
          <span className="stat-value">{requiredFields}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Sections</span>
          <span className="stat-value">{displayTemplate.categories.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Last Modified</span>
          <span className="stat-value">
            {displayTemplate.lastModified.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Template Dates */}
      <div className="preview-dates">
        <div className="date-item">
          <span className="date-label">Created:</span>
          <span className="date-value">
            {displayTemplate.createdDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="date-item">
          <span className="date-label">Last Modified:</span>
          <span className="date-value">
            {displayTemplate.lastModified.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Categories & Fields */}
      <div className="preview-categories">
        <h3>Template Structure</h3>

        {displayTemplate.categories.map((category, catIndex) => (
          <div key={category.id} className="category-preview">
            <div
              className="category-header-preview"
              onClick={() => toggleSection(category.id)}
            >
              <span className="category-toggle">
                {expandedSections[category.id] ? '▼' : '▶'}
              </span>
              <span className="category-number">{catIndex + 1}</span>
              <span className="category-name">{category.name}</span>
              <span className="field-count">({category.fields.length} fields)</span>
            </div>

            <p className="category-description">{category.description}</p>

            {expandedSections[category.id] && (
              <div className="fields-list">
                {category.fields.map((field, fieldIndex) => (
                  <div key={field.id} className="field-preview">
                    <div className="field-number">{fieldIndex + 1}</div>
                    <div className="field-icon">{getFieldIcon(field.type)}</div>
                    <div className="field-details">
                      <div className="field-name-row">
                        <span className="field-name">{field.label}</span>
                        {field.required && <span className="required-badge">Required</span>}
                      </div>
                      <div className="field-info">
                        <span className="field-type">{field.type}</span>
                        {field.maxLength && (
                          <span className="field-constraint">Max: {field.maxLength} chars</span>
                        )}
                        {field.minLength && (
                          <span className="field-constraint">Min: {field.minLength} chars</span>
                        )}
                        {field.min !== undefined && (
                          <span className="field-constraint">Min: {field.min}</span>
                        )}
                        {field.max !== undefined && (
                          <span className="field-constraint">Max: {field.max}</span>
                        )}
                      </div>
                      {field.options && (
                        <div className="field-options">
                          Options: {field.options.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="preview-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon required-badge">Required</span>
            <span className="legend-text">Field must be completed</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">📝</span>
            <span className="legend-text">Text field</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">📄</span>
            <span className="legend-text">Large text area</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🔢</span>
            <span className="legend-text">Numeric field</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">📅</span>
            <span className="legend-text">Date field</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="preview-footer">
        <p>
          This template contains {totalFields} fields across {displayTemplate.categories.length} sections.
          {requiredFields > 0 && ` ${requiredFields} field(s) are required.`}
        </p>
      </div>
    </div>
  );
};

export default TemplatePreview;
