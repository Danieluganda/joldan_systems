/**
 * Validation Engine - Feature 1: Required Fields & Rules
 * 
 * Enforces procurement validation rules, required fields per stage,
 * data integrity checks, and PPDA compliance validation
 */

class ValidationEngine {
  /**
   * Validation rule definitions per stage
   */
  static VALIDATION_RULES = {
    planning: {
      name: 'Procurement Planning',
      rules: {
        procurementTitle: { type: 'string', required: true, minLength: 10, maxLength: 200 },
        procurementType: { type: 'string', required: true, enum: ['goods', 'services', 'works'] },
        estimatedBudget: { type: 'number', required: true, min: 0 },
        procurementReason: { type: 'string', required: true, minLength: 20 },
        businessJustification: { type: 'string', required: true, minLength: 50 },
        riskLevel: { type: 'string', required: true, enum: ['low', 'medium', 'high', 'critical'] },
        complianceNotes: { type: 'string', required: false },
      },
    },
    template: {
      name: 'Template Selection',
      rules: {
        rfqTemplate: { type: 'string', required: true },
        evaluationTemplate: { type: 'string', required: true },
        templateCustomizations: { type: 'object', required: false },
        technicalSpecifications: { type: 'string', required: true, minLength: 50 },
      },
    },
    rfq: {
      name: 'RFQ Creation',
      rules: {
        rfqTitle: { type: 'string', required: true, minLength: 10 },
        rfqDescription: { type: 'string', required: true, minLength: 50 },
        closingDate: { type: 'date', required: true },
        closingTime: { type: 'string', required: true, format: 'HH:mm' },
        submissionFormat: { type: 'string', required: true, enum: ['electronic', 'physical', 'both'] },
        technicalCriteria: { type: 'array', required: true, minItems: 2 },
        financialCriteria: { type: 'array', required: true, minItems: 1 },
      },
    },
    clarification: {
      name: 'Clarifications & Q&A',
      rules: {
        clarificationDeadline: { type: 'date', required: true },
        publicationMethod: { type: 'string', required: true },
        answerFormat: { type: 'string', required: true },
      },
    },
    submission: {
      name: 'Submission Register',
      rules: {
        submissionLogCreated: { type: 'boolean', required: true },
        submissionDeadlineSet: { type: 'boolean', required: true },
        biddersNotified: { type: 'boolean', required: true },
      },
    },
    evaluation: {
      name: 'Evaluation',
      rules: {
        technicalEvaluators: { type: 'array', required: true, minItems: 1 },
        financialEvaluators: { type: 'array', required: true, minItems: 1 },
        evaluationCriteria: { type: 'object', required: true },
        scoringMethod: { type: 'string', required: true, enum: ['weighted', 'unweighted', 'pass-fail'] },
        evaluationDeadline: { type: 'date', required: true },
      },
    },
    approval: {
      name: 'Approval',
      rules: {
        technicalApprover: { type: 'string', required: true },
        financialApprover: { type: 'string', required: true },
        legalApprover: { type: 'string', required: true },
        awardRecommendation: { type: 'string', required: true },
        approvalDeadline: { type: 'date', required: true },
      },
    },
    award: {
      name: 'Award Decision',
      rules: {
        awardedBidder: { type: 'string', required: true },
        awardAmount: { type: 'number', required: true, min: 0 },
        awardJustification: { type: 'string', required: true, minLength: 50 },
        contractingMethod: { type: 'string', required: true },
        publicationDate: { type: 'date', required: true },
      },
    },
  };

  /**
   * PPDA Compliance Checklist
   */
  static PPDA_REQUIREMENTS = [
    { code: 'PPDA_1', requirement: 'Competitive bidding process required', mandatory: true },
    { code: 'PPDA_2', requirement: 'Public notice of intent', mandatory: true },
    { code: 'PPDA_3', requirement: 'Minimum bid period (7+ days)', mandatory: true },
    { code: 'PPDA_4', requirement: 'Transparent evaluation criteria', mandatory: true },
    { code: 'PPDA_5', requirement: 'Documented decision making', mandatory: true },
    { code: 'PPDA_6', requirement: 'Independent evaluation panels', mandatory: true },
    { code: 'PPDA_7', requirement: 'Conflict of interest declarations', mandatory: true },
    { code: 'PPDA_8', requirement: 'Complaints mechanism', mandatory: true },
    { code: 'PPDA_9', requirement: 'Audit trail maintained', mandatory: true },
    { code: 'PPDA_10', requirement: 'Budget availability confirmed', mandatory: true },
  ];

  /**
   * Validate data against stage rules
   * @param {string} stage
   * @param {object} data
   * @returns {object} {valid: boolean, errors: array}
   */
  static validateStage(stage, data = {}) {
    const rules = this.VALIDATION_RULES[stage];
    if (!rules) {
      return {
        valid: false,
        errors: [`Unknown stage: ${stage}`],
      };
    }

    const errors = [];

    Object.keys(rules.rules).forEach(fieldName => {
      const rule = rules.rules[fieldName];
      const value = data[fieldName];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldName} is required`);
        return;
      }

      if (value === undefined || value === null || value === '') {
        return; // Skip further validation for optional empty fields
      }

      // Check type
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${fieldName} must be a string`);
        return;
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`${fieldName} must be a number`);
        return;
      }

      if (rule.type === 'array' && !Array.isArray(value)) {
        errors.push(`${fieldName} must be an array`);
        return;
      }

      if (rule.type === 'object' && typeof value !== 'object') {
        errors.push(`${fieldName} must be an object`);
        return;
      }

      if (rule.type === 'date') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${fieldName} must be a valid date`);
          return;
        }
      }

      if (rule.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${fieldName} must be a boolean`);
        return;
      }

      // Check minLength
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
      }

      // Check maxLength
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${fieldName} must not exceed ${rule.maxLength} characters`);
      }

      // Check min value
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${fieldName} must be at least ${rule.min}`);
      }

      // Check max value
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${fieldName} must not exceed ${rule.max}`);
      }

      // Check enum
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${fieldName} must be one of: ${rule.enum.join(', ')}`);
      }

      // Check minItems for arrays
      if (rule.minItems && Array.isArray(value) && value.length < rule.minItems) {
        errors.push(`${fieldName} must have at least ${rule.minItems} items`);
      }

      // Check format
      if (rule.format === 'HH:mm') {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(value)) {
          errors.push(`${fieldName} must be in HH:mm format`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      stage: stage,
      stageName: rules.name,
    };
  }

  /**
   * Validate PPDA compliance
   * @param {object} procurementData
   * @returns {object} {compliant: boolean, passed: array, failed: array, overallScore: number}
   */
  static validatePPDACompliance(procurementData = {}) {
    const passed = [];
    const failed = [];

    this.PPDA_REQUIREMENTS.forEach(req => {
      const isCompliant = this.checkPPDARequirement(req.code, procurementData);
      if (isCompliant) {
        passed.push(req);
      } else {
        failed.push(req);
      }
    });

    const overallScore = Math.round((passed.length / this.PPDA_REQUIREMENTS.length) * 100);

    return {
      compliant: failed.length === 0,
      passed,
      failed,
      overallScore,
      passedCount: passed.length,
      failedCount: failed.length,
      totalRequirements: this.PPDA_REQUIREMENTS.length,
    };
  }

  /**
   * Check individual PPDA requirement
   * @private
   */
  static checkPPDARequirement(requirementCode, procurementData = {}) {
    const checks = {
      PPDA_1: () => procurementData.procurementType === 'competitive',
      PPDA_2: () => procurementData.publicNoticePublished === true,
      PPDA_3: () => procurementData.bidPeriodDays >= 7,
      PPDA_4: () => procurementData.evaluationCriteria && Object.keys(procurementData.evaluationCriteria).length > 0,
      PPDA_5: () => procurementData.decisionDocumented === true,
      PPDA_6: () => procurementData.evaluationPanel && procurementData.evaluationPanel.length >= 3,
      PPDA_7: () => procurementData.conflictOfInterestDeclared === true,
      PPDA_8: () => procurementData.complaintsProcess === true,
      PPDA_9: () => procurementData.auditTrailEnabled === true,
      PPDA_10: () => procurementData.budgetConfirmed === true,
    };

    const checkFn = checks[requirementCode];
    return checkFn ? checkFn() : false;
  }

  /**
   * Get validation rules for stage
   * @param {string} stage
   * @returns {object}
   */
  static getStageRules(stage) {
    const rules = this.VALIDATION_RULES[stage];
    if (!rules) {
      return null;
    }

    return {
      stageName: rules.name,
      fields: rules.rules,
      requiredFields: Object.keys(rules.rules).filter(k => rules.rules[k].required),
      optionalFields: Object.keys(rules.rules).filter(k => !rules.rules[k].required),
    };
  }

  /**
   * Get all validation stages
   * @returns {array}
   */
  static getAllValidationStages() {
    return Object.keys(this.VALIDATION_RULES).map(stage => ({
      stage,
      name: this.VALIDATION_RULES[stage].name,
    }));
  }

  /**
   * Validate complete procurement data across all stages
   * @param {object} procurement
   * @returns {object} Overall validation result
   */
  static validateComplete(procurement = {}) {
    const results = [];
    const allStages = Object.keys(this.VALIDATION_RULES);

    allStages.forEach(stage => {
      const result = this.validateStage(stage, procurement[stage] || {});
      results.push({
        stage,
        ...result,
      });
    });

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const passedStages = results.filter(r => r.valid).length;

    return {
      overallValid: totalErrors === 0,
      totalStages: allStages.length,
      passedStages,
      failedStages: results.filter(r => !r.valid),
      totalErrors,
      results,
    };
  }
}

module.exports = ValidationEngine;
