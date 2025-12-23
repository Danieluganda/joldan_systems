/**
 * Linking Engine - Feature 11: Cross-Entity Relationships
 * 
 * Manages relationships between Plan ↔ RFQ ↔ Evaluation ↔ Approval ↔ Contract
 * Ensures integrity of procurement workflow connections and validates dependencies
 */

class LinkingEngine {
  /**
   * Link types
   */
  static LINK_TYPES = {
    PLAN_TO_RFQ: 'plan_to_rfq',
    RFQ_TO_SUBMISSION: 'rfq_to_submission',
    SUBMISSION_TO_EVALUATION: 'submission_to_evaluation',
    EVALUATION_TO_APPROVAL: 'evaluation_to_approval',
    APPROVAL_TO_AWARD: 'approval_to_award',
    AWARD_TO_CONTRACT: 'award_to_contract',
    DOCUMENT_TO_PROCUREMENT: 'document_to_procurement',
    TEMPLATE_TO_RFQ: 'template_to_rfq',
  };

  /**
   * Create a link between two entities
   * @param {string} linkType
   * @param {string} sourceId - ID of source entity
   * @param {string} targetId - ID of target entity
   * @param {object} metadata - {createdBy, reason, timestamp}
   * @returns {object} Created link
   */
  static createLink(linkType, sourceId, targetId, metadata = {}) {
    if (!this.LINK_TYPES[linkType]) {
      return {
        success: false,
        error: `Unknown link type: ${linkType}`,
      };
    }

    if (!sourceId || !targetId) {
      return {
        success: false,
        error: 'Both source and target IDs are required',
      };
    }

    const link = {
      id: this.generateLinkId(),
      type: linkType,
      sourceId,
      targetId,
      createdAt: metadata.timestamp || new Date(),
      createdBy: metadata.createdBy || 'system',
      reason: metadata.reason || '',
      status: 'active',
      metadata: metadata.metadata || {},
    };

    return {
      success: true,
      link,
    };
  }

  /**
   * Generate unique link ID
   * @private
   */
  static generateLinkId() {
    return `LINK_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Validate link can be created
   * @param {string} linkType
   * @param {object} sourceEntity
   * @param {object} targetEntity
   * @returns {object} {valid: boolean, reason: string}
   */
  static validateLink(linkType, sourceEntity = {}, targetEntity = {}) {
    const linkRules = {
      plan_to_rfq: {
        sourceType: 'Plan',
        targetType: 'RFQ',
        sourceRequired: ['title', 'procurementType'],
        targetRequired: ['rfqDocument'],
      },
      rfq_to_submission: {
        sourceType: 'RFQ',
        targetType: 'Submission',
        sourceRequired: ['rfqDocument', 'closingDate'],
        targetRequired: ['submissionLog'],
      },
      submission_to_evaluation: {
        sourceType: 'Submission',
        targetType: 'Evaluation',
        sourceRequired: ['submissionLog'],
        targetRequired: ['evaluationScores'],
      },
      evaluation_to_approval: {
        sourceType: 'Evaluation',
        targetType: 'Approval',
        sourceRequired: ['evaluationScores'],
        targetRequired: ['approvalStatus'],
      },
      approval_to_award: {
        sourceType: 'Approval',
        targetType: 'Award',
        sourceRequired: ['approvalStatus'],
        targetRequired: ['awardDecision'],
      },
      award_to_contract: {
        sourceType: 'Award',
        targetType: 'Contract',
        sourceRequired: ['awardDecision'],
        targetRequired: ['contractDocument'],
      },
    };

    const rule = linkRules[linkType];
    if (!rule) {
      return {
        valid: false,
        reason: `Unknown link type: ${linkType}`,
      };
    }

    // Check source has required fields
    const missingSourceFields = rule.sourceRequired.filter(f => !sourceEntity[f]);
    if (missingSourceFields.length > 0) {
      return {
        valid: false,
        reason: `${rule.sourceType} missing required fields: ${missingSourceFields.join(', ')}`,
      };
    }

    // Check target has required fields
    const missingTargetFields = rule.targetRequired.filter(f => !targetEntity[f]);
    if (missingTargetFields.length > 0) {
      return {
        valid: false,
        reason: `${rule.targetType} missing required fields: ${missingTargetFields.join(', ')}`,
      };
    }

    return {
      valid: true,
      reason: 'Link validation passed',
    };
  }

  /**
   * Get all entities linked to a source
   * @param {string} sourceId
   * @param {array} links - All link objects
   * @param {string} linkType - Optional filter by type
   * @returns {array} Linked target IDs
   */
  static getLinkedEntities(sourceId, links = [], linkType = null) {
    let filtered = links.filter(l => l.sourceId === sourceId && l.status === 'active');

    if (linkType) {
      filtered = filtered.filter(l => l.type === linkType);
    }

    return filtered.map(l => ({
      targetId: l.targetId,
      linkType: l.type,
      createdAt: l.createdAt,
      createdBy: l.createdBy,
    }));
  }

  /**
   * Get all entities linking to a target (reverse links)
   * @param {string} targetId
   * @param {array} links
   * @param {string} linkType
   * @returns {array} Source IDs and link details
   */
  static getReverseLinks(targetId, links = [], linkType = null) {
    let filtered = links.filter(l => l.targetId === targetId && l.status === 'active');

    if (linkType) {
      filtered = filtered.filter(l => l.type === linkType);
    }

    return filtered.map(l => ({
      sourceId: l.sourceId,
      linkType: l.type,
      createdAt: l.createdAt,
      createdBy: l.createdBy,
    }));
  }

  /**
   * Get complete procurement chain for a procurement
   * @param {string} procurementId
   * @param {array} links
   * @param {object} entities - Map of all entities
   * @returns {object} Complete chain with all related entities
   */
  static getProcurementChain(procurementId, links = [], entities = {}) {
    const chain = {
      procurementId,
      plan: null,
      rfq: null,
      submissions: [],
      evaluations: [],
      approvals: [],
      award: null,
      contract: null,
    };

    // Find related entities using links
    const planLinks = links.filter(l => 
      l.type === this.LINK_TYPES.PLAN_TO_RFQ && l.sourceId === procurementId
    );

    if (planLinks.length > 0) {
      chain.plan = entities[planLinks[0].targetId];
    }

    // Continue tracing through chain
    // This is a simplified version - full implementation would traverse complete chain

    return chain;
  }

  /**
   * Check if link path exists between two entities
   * @param {string} startId
   * @param {string} endId
   * @param {array} links
   * @returns {object} {pathExists: boolean, path: array}
   */
  static findPath(startId, endId, links = []) {
    const visited = new Set();
    const queue = [{
      id: startId,
      path: [startId],
    }];

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.id === endId) {
        return {
          pathExists: true,
          path: current.path,
          distance: current.path.length - 1,
        };
      }

      if (visited.has(current.id)) {
        continue;
      }

      visited.add(current.id);

      // Find next entities in chain
      const nextLinks = links.filter(l => 
        l.sourceId === current.id && !visited.has(l.targetId)
      );

      nextLinks.forEach(link => {
        queue.push({
          id: link.targetId,
          path: [...current.path, link.targetId],
        });
      });
    }

    return {
      pathExists: false,
      path: [],
    };
  }

  /**
   * Validate procurement link integrity
   * @param {string} procurementId
   * @param {array} links
   * @returns {object} Validation result with issues
   */
  static validateProcurementChain(procurementId, links = []) {
    const issues = [];

    // Check for required links
    const requiredLinkSequence = [
      this.LINK_TYPES.PLAN_TO_RFQ,
      this.LINK_TYPES.RFQ_TO_SUBMISSION,
      this.LINK_TYPES.SUBMISSION_TO_EVALUATION,
      this.LINK_TYPES.EVALUATION_TO_APPROVAL,
      this.LINK_TYPES.APPROVAL_TO_AWARD,
      this.LINK_TYPES.AWARD_TO_CONTRACT,
    ];

    // Find links for this procurement
    const procLinks = links.filter(l => 
      l.metadata?.procurementId === procurementId || 
      l.sourceId === procurementId
    );

    requiredLinkSequence.forEach(linkType => {
      const found = procLinks.find(l => l.type === linkType);
      if (!found) {
        issues.push({
          type: 'missingLink',
          linkType,
          severity: 'warning',
        });
      }
    });

    // Check for broken links (pointing to non-existent entities)
    // This would require access to actual entities

    // Check for circular references
    const circularRefs = this.detectCircularReferences(procLinks);
    if (circularRefs.length > 0) {
      issues.push({
        type: 'circularReference',
        references: circularRefs,
        severity: 'critical',
      });
    }

    return {
      procurementId,
      chainValid: issues.length === 0,
      issues,
      linkCount: procLinks.length,
    };
  }

  /**
   * Detect circular references in links
   * @private
   */
  static detectCircularReferences(links = []) {
    const circular = [];

    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const link1 = links[i];
        const link2 = links[j];

        // Simple circular detection: A->B and B->A
        if (link1.sourceId === link2.targetId && link1.targetId === link2.sourceId) {
          circular.push({
            entities: [link1.sourceId, link1.targetId],
            linkTypes: [link1.type, link2.type],
          });
        }
      }
    }

    return circular;
  }

  /**
   * Update link status
   * @param {string} linkId
   * @param {string} newStatus - 'active', 'inactive', 'archived'
   * @param {array} links
   * @returns {object} Updated link
   */
  static updateLinkStatus(linkId, newStatus, links = []) {
    const link = links.find(l => l.id === linkId);

    if (!link) {
      return {
        success: false,
        error: `Link ${linkId} not found`,
      };
    }

    link.status = newStatus;
    link.statusUpdatedAt = new Date();

    return {
      success: true,
      link,
    };
  }

  /**
   * Get link statistics
   * @param {array} links
   * @returns {object} Statistics about links
   */
  static getLinkStatistics(links = []) {
    const stats = {
      totalLinks: links.length,
      activeLinks: links.filter(l => l.status === 'active').length,
      inactiveLinks: links.filter(l => l.status === 'inactive').length,
      archivedLinks: links.filter(l => l.status === 'archived').length,
      linkTypeBreakdown: {},
    };

    links.forEach(l => {
      stats.linkTypeBreakdown[l.type] = (stats.linkTypeBreakdown[l.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get workflow progress based on links
   * @param {string} procurementId
   * @param {array} links
   * @returns {object} Progress through procurement stages
   */
  static getWorkflowProgress(procurementId, links = []) {
    const stages = [
      { stage: 'Plan', linkType: this.LINK_TYPES.PLAN_TO_RFQ },
      { stage: 'RFQ', linkType: this.LINK_TYPES.RFQ_TO_SUBMISSION },
      { stage: 'Submission', linkType: this.LINK_TYPES.SUBMISSION_TO_EVALUATION },
      { stage: 'Evaluation', linkType: this.LINK_TYPES.EVALUATION_TO_APPROVAL },
      { stage: 'Approval', linkType: this.LINK_TYPES.APPROVAL_TO_AWARD },
      { stage: 'Award', linkType: this.LINK_TYPES.AWARD_TO_CONTRACT },
      { stage: 'Contract', linkType: null },
    ];

    const progress = [];
    const procLinks = links.filter(l => l.metadata?.procurementId === procurementId);

    stages.forEach((s, index) => {
      const linkExists = s.linkType ? procLinks.find(l => l.type === s.linkType) : true;
      const completed = linkExists ? true : false;

      progress.push({
        stage: s.stage,
        completed,
        order: index + 1,
        completedAt: linkExists?.createdAt,
      });
    });

    const completedStages = progress.filter(p => p.completed).length;
    const progressPercentage = Math.round((completedStages / stages.length) * 100);

    return {
      procurementId,
      stages: progress,
      completedStages,
      totalStages: stages.length,
      progressPercentage,
    };
  }

  /**
   * Export link report
   * @param {array} links
   * @param {string} format - 'json' or 'csv'
   * @returns {object} Exported report
   */
  static exportReport(links = [], format = 'json') {
    if (format === 'csv') {
      return {
        format: 'csv',
        data: this.convertToCSV(links),
        timestamp: new Date(),
      };
    }

    return {
      format: 'json',
      data: links,
      timestamp: new Date(),
      recordCount: links.length,
    };
  }

  /**
   * Convert links to CSV
   * @private
   */
  static convertToCSV(links = []) {
    if (links.length === 0) return 'No data';

    const headers = ['Link ID', 'Type', 'Source ID', 'Target ID', 'Status', 'Created By', 'Created At'];
    const rows = links.map(l => [
      l.id,
      l.type,
      l.sourceId,
      l.targetId,
      l.status,
      l.createdBy,
      l.createdAt,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

module.exports = LinkingEngine;
