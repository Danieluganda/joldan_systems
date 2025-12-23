import React, { useState, useEffect } from 'react';
import TemplatePreview from './TemplatePreview';
import './templates.css';

/**
 * TemplateSelector Component
 * 
 * Displays available templates for user selection.
 * Shows template list with preview and selection capability.
 * 
 * Features:
 * - Template library listing
 * - Template preview
 * - Filtering and search
 * - Selection with confirmation
 * - Template details display
 * - Create custom template option
 */

const TemplateSelector = ({
  templates = [],
  onSelectTemplate = null,
  allowCustom = true,
  multiSelect = false
}) => {
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Default templates if none provided
  const defaultTemplates = [
    {
      id: 'template_001',
      name: 'Standard Procurement',
      category: 'general',
      description: 'General purpose procurement template for goods and services',
      fields: 8,
      status: 'Active',
      uses: 42,
      lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60000),
      icon: '📋'
    },
    {
      id: 'template_002',
      name: 'Construction Services',
      category: 'works',
      description: 'Specialized template for construction and engineering services',
      fields: 12,
      status: 'Active',
      uses: 18,
      lastUsed: new Date(Date.now() - 15 * 24 * 60 * 60000),
      icon: '🏗️'
    },
    {
      id: 'template_003',
      name: 'IT & Software',
      category: 'services',
      description: 'Template for IT, software, and technology procurement',
      fields: 10,
      status: 'Active',
      uses: 35,
      lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60000),
      icon: '💻'
    },
    {
      id: 'template_004',
      name: 'Medical Supplies',
      category: 'goods',
      description: 'Specialized template for medical equipment and supplies',
      fields: 14,
      status: 'Active',
      uses: 12,
      lastUsed: new Date(Date.now() - 30 * 24 * 60 * 60000),
      icon: '⚕️'
    },
    {
      id: 'template_005',
      name: 'Training Services',
      category: 'services',
      description: 'Template for training, consulting, and professional services',
      fields: 9,
      status: 'Active',
      uses: 8,
      lastUsed: new Date(Date.now() - 60 * 24 * 60 * 60000),
      icon: '📚'
    },
    {
      id: 'template_006',
      name: 'Vehicle Purchase',
      category: 'goods',
      description: 'Template for vehicle procurement and fleet management',
      fields: 11,
      status: 'Active',
      uses: 15,
      lastUsed: new Date(Date.now() - 10 * 24 * 60 * 60000),
      icon: '🚗'
    }
  ];

  const useTemplates = templates.length > 0 ? templates : defaultTemplates;

  // Filter and sort templates
  const filteredTemplates = useTemplates
    .filter(t => {
      // Category filter
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;

      // Search filter
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'uses') return b.uses - a.uses;
      if (sortBy === 'recent') return new Date(b.lastUsed) - new Date(a.lastUsed);
      return 0;
    });

  // Handle template selection
  const handleSelectTemplate = (template) => {
    if (multiSelect) {
      const isSelected = selectedTemplates.some(t => t.id === template.id);
      if (isSelected) {
        setSelectedTemplates(selectedTemplates.filter(t => t.id !== template.id));
      } else {
        setSelectedTemplates([...selectedTemplates, template]);
      }
    } else {
      setSelectedTemplates([template]);
    }
  };

  // Confirm selection
  const handleConfirmSelection = () => {
    if (selectedTemplates.length > 0 && onSelectTemplate) {
      onSelectTemplate(multiSelect ? selectedTemplates : selectedTemplates[0]);
    }
  };

  // Get unique categories
  const categories = ['all', ...new Set(useTemplates.map(t => t.category))];
  const categoryLabels = {
    all: 'All Templates',
    general: 'General',
    goods: 'Goods',
    services: 'Services',
    works: 'Works'
  };

  // Format relative time
  const formatRelativeTime = (date) => {
    const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="template-selector">
      {previewTemplate ? (
        // Preview Mode
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      ) : (
        // Selection Mode
        <>
          <div className="selector-header">
            <h2>Select a Template</h2>
            <p className="selector-subtitle">Choose a template to start your procurement</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="selector-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>

            <div className="filter-group">
              <label htmlFor="category-filter">Category:</label>
              <select
                id="category-filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="sort-by">Sort By:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name">Name</option>
                <option value="uses">Most Used</option>
                <option value="recent">Recently Used</option>
              </select>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="templates-grid">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map(template => {
                const isSelected = selectedTemplates.some(t => t.id === template.id);

                return (
                  <div
                    key={template.id}
                    className={`template-card ${isSelected ? 'selected' : ''}`}
                  >
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="template-icon">{template.icon}</div>
                      <div className="template-title">
                        <h3>{template.name}</h3>
                        <span className="template-category">{categoryLabels[template.category]}</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body">
                      <p className="template-description">{template.description}</p>

                      <div className="template-stats">
                        <div className="stat">
                          <span className="stat-icon">📋</span>
                          <span className="stat-text">{template.fields} fields</span>
                        </div>
                        <div className="stat">
                          <span className="stat-icon">📊</span>
                          <span className="stat-text">Used {template.uses} times</span>
                        </div>
                        <div className="stat">
                          <span className="stat-icon">⏰</span>
                          <span className="stat-text">{formatRelativeTime(template.lastUsed)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="card-actions">
                      <button
                        className="btn-preview"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        👁️ Preview
                      </button>
                      <button
                        className={`btn-select ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        {isSelected ? '✓ Selected' : 'Select'}
                      </button>
                    </div>

                    {isSelected && (
                      <div className="selection-indicator">✓</div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="no-templates">
                <p>No templates found matching your criteria.</p>
                <p>Try adjusting your filters or search.</p>
              </div>
            )}
          </div>

          {/* Custom Template Option */}
          {allowCustom && (
            <div className="custom-template-option">
              <div className="custom-card">
                <div className="custom-icon">➕</div>
                <h3>Create Custom Template</h3>
                <p>Build your own template from scratch</p>
                <button className="btn-create-custom">
                  Create New Template
                </button>
              </div>
            </div>
          )}

          {/* Selection Summary */}
          {selectedTemplates.length > 0 && (
            <div className="selection-summary">
              <div className="summary-content">
                <p className="summary-text">
                  {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
                </p>
                <div className="selected-items">
                  {selectedTemplates.map(t => (
                    <span key={t.id} className="selected-item">
                      {t.name}
                      <button
                        className="remove-btn"
                        onClick={() => setSelectedTemplates(selectedTemplates.filter(st => st.id !== t.id))}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                className="btn-confirm-selection"
                onClick={handleConfirmSelection}
              >
                Confirm Selection →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TemplateSelector;
