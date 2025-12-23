/**
 * Workflow Engine - Feature 3: Step Gating & Dependencies
 * 
 * Manages procurement workflow states, validates transitions,
 * enforces step dependencies, and tracks progress through stages
 */

class WorkflowEngine {
  // Procurement workflow stages
  static STAGES = {
    PLANNING: 'planning',
    TEMPLATE: 'template',
    RFQ: 'rfq',
    CLARIFICATION: 'clarification',
    SUBMISSION: 'submission',
    EVALUATION: 'evaluation',
    APPROVAL: 'approval',
    AWARD: 'award',
  };

  // Valid transitions between stages
  static TRANSITIONS = {
    'planning': ['template'],
    'template': ['rfq'],
    'rfq': ['clarification'],
    'clarification': ['submission'],
    'submission': ['evaluation'],
    'evaluation': ['approval'],
    'approval': ['award'],
    'award': [],
  };

  // Stage dependencies - what must be complete before advancing
  static STAGE_REQUIREMENTS = {
    planning: {
      description: 'Planning Phase',
      requiredDocuments: ['procurementPlan'],
      requiredApprovals: ['planApproval'],
      minDays: 0,
    },
    template: {
      description: 'Template Phase',
      requiredDocuments: ['rfqTemplate', 'evaluationTemplate'],
      requiredApprovals: ['templateApproval'],
      minDays: 2,
    },
    rfq: {
      description: 'RFQ Phase',
      requiredDocuments: ['rfqDocument'],
      requiredApprovals: ['rfqApproval'],
      minDays: 3,
    },
    clarification: {
      description: 'Clarification Phase',
      requiredDocuments: ['rfqDocument'],
      requiredApprovals: [],
      minDays: 2,
    },
    submission: {
      description: 'Submission Phase',
      requiredDocuments: ['submissionLog'],
      requiredApprovals: [],
      minDays: 1,
    },
    evaluation: {
      description: 'Evaluation Phase',
      requiredDocuments: ['evaluationScores'],
      requiredApprovals: ['evaluationApproval'],
      minDays: 5,
    },
    approval: {
      description: 'Approval Phase',
      requiredDocuments: ['evaluationResults'],
      requiredApprovals: ['technicalApproval', 'financialApproval', 'legalApproval'],
      minDays: 3,
    },
    award: {
      description: 'Award Phase',
      requiredDocuments: ['awardDecision', 'contract'],
      requiredApprovals: ['awardApproval'],
      minDays: 0,
    },
  };

  // Progress completion percentages for each stage
  static STAGE_PROGRESS = {
    planning: 10,
    template: 20,
    rfq: 30,
    clarification: 40,
    submission: 50,
    evaluation: 70,
    approval: 85,
    award: 100,
  };

  /**
   * Validate if a stage transition is allowed
   * @param {string} currentStage
   * @param {string} targetStage
   * @returns {object} {allowed: boolean, reason: string}
   */
  static canTransition(currentStage, targetStage) {
    if (!this.TRANSITIONS[currentStage]) {
      return {
        allowed: false,
        reason: `Unknown current stage: ${currentStage}`,
      };
    }

    const allowedTransitions = this.TRANSITIONS[currentStage];
    if (!allowedTransitions.includes(targetStage)) {
      return {
        allowed: false,
        reason: `Cannot transition from ${currentStage} to ${targetStage}. Allowed: ${allowedTransitions.join(', ')}`,
      };
    }

    return {
      allowed: true,
      reason: 'Transition is valid',
    };
  }

  /**
   * Validate stage requirements are met
   * @param {string} stage
   * @param {object} procurementData - Procurement with documents, approvals
   * @returns {object} {metRequirements: boolean, missingItems: array, readyToAdvance: boolean}
   */
  static validateStageRequirements(stage, procurementData = {}) {
    const requirements = this.STAGE_REQUIREMENTS[stage];
    if (!requirements) {
      return {
        metRequirements: false,
        missingItems: [`Unknown stage: ${stage}`],
        readyToAdvance: false,
      };
    }

    const missingItems = [];

    // Check required documents
    const documents = procurementData.documents || [];
    const documentNames = documents.map(d => d.type);
    requirements.requiredDocuments.forEach(docType => {
      if (!documentNames.includes(docType)) {
        missingItems.push(`Missing document: ${docType}`);
      }
    });

    // Check required approvals
    const approvals = procurementData.approvals || [];
    const approvedTypes = approvals
      .filter(a => a.status === 'approved')
      .map(a => a.type);
    requirements.requiredApprovals.forEach(approvalType => {
      if (!approvedTypes.includes(approvalType)) {
        missingItems.push(`Missing approval: ${approvalType}`);
      }
    });

    const metRequirements = missingItems.length === 0;

    return {
      metRequirements,
      missingItems,
      readyToAdvance: metRequirements,
      requirements: requirements,
    };
  }

  /**
   * Get next stage in workflow
   * @param {string} currentStage
   * @returns {string|null}
   */
  static getNextStage(currentStage) {
    const transitions = this.TRANSITIONS[currentStage];
    return transitions && transitions.length > 0 ? transitions[0] : null;
  }

  /**
   * Get previous stage in workflow
   * @param {string} currentStage
   * @returns {string|null}
   */
  static getPreviousStage(currentStage) {
    const stageArray = Object.keys(this.STAGES);
    const currentIndex = stageArray.indexOf(currentStage);
    return currentIndex > 0 ? stageArray[currentIndex - 1] : null;
  }

  /**
   * Get workflow progress
   * @param {string} currentStage
   * @returns {object} {stage, progress: number, nextStage, previousStage}
   */
  static getProgress(currentStage) {
    const progress = this.STAGE_PROGRESS[currentStage] || 0;
    const nextStage = this.getNextStage(currentStage);
    const previousStage = this.getPreviousStage(currentStage);

    return {
      stage: currentStage,
      progress,
      nextStage,
      previousStage,
      description: this.STAGE_REQUIREMENTS[currentStage]?.description || currentStage,
    };
  }

  /**
   * Get all stages in order
   * @returns {array}
   */
  static getAllStages() {
    return Object.keys(this.STAGES);
  }

  /**
   * Check if stage is before another stage
   * @param {string} stageA
   * @param {string} stageB
   * @returns {boolean}
   */
  static isBefore(stageA, stageB) {
    const stages = this.getAllStages();
    return stages.indexOf(stageA) < stages.indexOf(stageB);
  }

  /**
   * Check if stage is after another stage
   * @param {string} stageA
   * @param {string} stageB
   * @returns {boolean}
   */
  static isAfter(stageA, stageB) {
    const stages = this.getAllStages();
    return stages.indexOf(stageA) > stages.indexOf(stageB);
  }

  /**
   * Get stage requirements details
   * @param {string} stage
   * @returns {object}
   */
  static getStageDetails(stage) {
    const requirements = this.STAGE_REQUIREMENTS[stage];
    const progress = this.STAGE_PROGRESS[stage];
    const transitions = this.TRANSITIONS[stage];

    if (!requirements) {
      return null;
    }

    return {
      stage,
      ...requirements,
      progress,
      allowedNextStages: transitions || [],
    };
  }

  /**
   * Simulate workflow progression
   * @param {string} currentStage
   * @param {number} daysInStage
   * @returns {object} {canAdvance: boolean, reason: string, nextStage: string}
   */
  static canAdvanceToNextStage(currentStage, daysInStage = 0) {
    const requirements = this.STAGE_REQUIREMENTS[currentStage];
    if (!requirements) {
      return {
        canAdvance: false,
        reason: 'Invalid stage',
      };
    }

    const nextStage = this.getNextStage(currentStage);
    if (!nextStage) {
      return {
        canAdvance: false,
        reason: 'Already at final stage',
      };
    }

    // Check minimum days in stage
    if (daysInStage < requirements.minDays) {
      return {
        canAdvance: false,
        reason: `Must remain in ${currentStage} for ${requirements.minDays} days. Currently: ${daysInStage} days`,
      };
    }

    return {
      canAdvance: true,
      reason: 'All requirements met',
      nextStage,
    };
  }

  /**
   * Calculate stage timeline estimates
   * @returns {array} Array of stages with estimated durations
   */
  static getTimelineEstimates() {
    const estimates = [];
    const stages = this.getAllStages();
    let totalDays = 0;

    stages.forEach(stage => {
      const requirements = this.STAGE_REQUIREMENTS[stage];
      const duration = requirements.minDays;
      totalDays += duration;

      estimates.push({
        stage,
        description: requirements.description,
        estimatedDays: duration,
        cumulativeDays: totalDays,
      });
    });

    return estimates;
  }

  /**
   * Get workflow state machine representation
   * @returns {object} Complete workflow definition
   */
  static getWorkflowDefinition() {
    return {
      stages: this.STAGES,
      transitions: this.TRANSITIONS,
      requirements: this.STAGE_REQUIREMENTS,
      progressMap: this.STAGE_PROGRESS,
      timeline: this.getTimelineEstimates(),
    };
  }
}

module.exports = WorkflowEngine;
