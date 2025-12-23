/**
 * Procurement Business Logic Helpers
 * Domain-specific utility functions for procurement operations
 */

/**
 * Calculate weighted score from evaluation criteria
 * @param {object} scores - Scores object with criteria as keys (0-10)
 * @param {array} weights - Array of criterion objects with id and weight
 * @returns {object} { totalScore, breakdown }
 */
const calculateWeightedScore = (scores, weights) => {
  let totalScore = 0;
  const breakdown = [];

  weights.forEach((criterion) => {
    const score = scores[criterion.id] || 0;
    const weighted = (score * criterion.weight) / 100;

    breakdown.push({
      criterion: criterion.id,
      label: criterion.label,
      score: score,
      weight: criterion.weight,
      weighted: parseFloat(weighted.toFixed(2)),
    });

    totalScore += weighted;
  });

  return {
    totalScore: parseFloat(totalScore.toFixed(2)),
    maxScore: 10,
    breakdown,
  };
};

/**
 * Determine procurement status based on stage
 * @param {string} stage - Current procurement stage
 * @returns {object} { status, nextStage, completion }
 */
const getProcurementStatus = (stage) => {
  const stages = [
    { id: 'planning', label: 'Planning', completion: 10 },
    { id: 'template', label: 'Template Creation', completion: 20 },
    { id: 'rfq', label: 'RFQ Release', completion: 30 },
    { id: 'clarification', label: 'Clarification', completion: 40 },
    { id: 'submission', label: 'Submission Period', completion: 50 },
    { id: 'evaluation', label: 'Evaluation', completion: 70 },
    { id: 'approval', label: 'Approval', completion: 85 },
    { id: 'award', label: 'Award', completion: 100 },
  ];

  const currentIndex = stages.findIndex((s) => s.id === stage);
  const current = stages[currentIndex] || stages[0];
  const next = stages[currentIndex + 1] || null;

  return {
    status: current.label,
    stage: current.id,
    completion: current.completion,
    nextStage: next ? next.id : null,
    nextLabel: next ? next.label : 'Complete',
  };
};

/**
 * Validate approval dependencies
 * @param {array} approvals - Array of approval objects
 * @returns {object} { canApprove, blockedBy, message }
 */
const validateApprovalDependencies = (approvals) => {
  const pending = approvals.filter((a) => a.status === 'pending');
  const notApproved = approvals.filter((a) => a.status !== 'approved');

  const results = pending.map((approval) => {
    if (!approval.dependencies || approval.dependencies.length === 0) {
      return {
        id: approval.id,
        canApprove: true,
        blockedBy: [],
        message: 'Ready for approval',
      };
    }

    const blockedBy = approval.dependencies.filter((depId) => {
      const dependency = approvals.find((a) => a.id === depId);
      return dependency && dependency.status !== 'approved';
    });

    return {
      id: approval.id,
      canApprove: blockedBy.length === 0,
      blockedBy,
      message:
        blockedBy.length === 0
          ? 'All dependencies met'
          : `Waiting for ${blockedBy.length} dependency(ies)`,
    };
  });

  return results;
};

/**
 * Calculate procurement timeline metrics
 * @param {array} timeline - Timeline events array
 * @returns {object} Metrics including delays, durations, bottlenecks
 */
const analyzeTimeline = (timeline) => {
  if (!timeline || timeline.length === 0) {
    return {
      totalDuration: 0,
      eventCount: 0,
      stages: [],
      bottlenecks: [],
      averageDaysBetweenEvents: 0,
    };
  }

  const sortedEvents = [...timeline].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const firstDate = new Date(sortedEvents[0].timestamp);
  const lastDate = new Date(sortedEvents[sortedEvents.length - 1].timestamp);
  const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

  // Calculate gaps between events
  const gaps = [];
  for (let i = 1; i < sortedEvents.length; i++) {
    const prev = new Date(sortedEvents[i - 1].timestamp);
    const current = new Date(sortedEvents[i].timestamp);
    const dayGap = Math.ceil((current - prev) / (1000 * 60 * 60 * 24));

    gaps.push({
      from: sortedEvents[i - 1].category,
      to: sortedEvents[i].category,
      days: dayGap,
      isBottleneck: dayGap > 7, // More than a week is a bottleneck
    });
  }

  const bottlenecks = gaps.filter((g) => g.isBottleneck);

  // Group by category
  const stageMap = {};
  sortedEvents.forEach((event) => {
    if (!stageMap[event.category]) {
      stageMap[event.category] = {
        category: event.category,
        count: 0,
        events: [],
      };
    }
    stageMap[event.category].count++;
    stageMap[event.category].events.push(event);
  });

  return {
    totalDuration: totalDays,
    eventCount: timeline.length,
    avgDaysBetweenEvents: Math.round(totalDays / (timeline.length - 1)),
    stages: Object.values(stageMap),
    bottlenecks,
    firstEvent: sortedEvents[0],
    lastEvent: sortedEvents[sortedEvents.length - 1],
  };
};

/**
 * Calculate approval metrics
 * @param {array} approvalHistory - Approval history array
 * @returns {object} Approval metrics
 */
const analyzeApprovals = (approvalHistory) => {
  if (!approvalHistory || approvalHistory.length === 0) {
    return {
      totalApprovals: 0,
      approved: 0,
      rejected: 0,
      changesRequested: 0,
      pending: 0,
      approvalRate: 0,
      avgApprovalTime: 0,
    };
  }

  const approved = approvalHistory.filter((a) => a.action === 'approved').length;
  const rejected = approvalHistory.filter((a) => a.action === 'rejected').length;
  const changesRequested = approvalHistory.filter(
    (a) => a.action === 'changes-requested'
  ).length;
  const pending = approvalHistory.filter((a) => !a.actionDate).length;

  // Calculate average approval time
  let totalTime = 0;
  let completedApprovals = 0;

  approvalHistory.forEach((record) => {
    if (record.actionDate) {
      const submitted = new Date(record.submittedAt);
      const actioned = new Date(record.actionDate);
      const timeDiff = actioned - submitted;
      totalTime += timeDiff;
      completedApprovals++;
    }
  });

  const avgApprovalHours = Math.round(
    (totalTime / completedApprovals / (1000 * 60 * 60)) * 10
  ) / 10;

  return {
    totalApprovals: approvalHistory.length,
    approved,
    rejected,
    changesRequested,
    pending,
    approvalRate: Math.round((approved / completedApprovals) * 100),
    avgApprovalTimeHours: completedApprovals > 0 ? avgApprovalHours : 0,
    completionRate: Math.round((completedApprovals / approvalHistory.length) * 100),
  };
};

/**
 * Calculate compliance score
 * @param {object} complianceData - Compliance data object
 * @returns {object} { score, status, riskLevel, issues }
 */
const calculateComplianceScore = (complianceData) => {
  if (!complianceData || !complianceData.summary) {
    return {
      score: 0,
      status: 'unknown',
      riskLevel: 'critical',
      criticalIssues: 0,
      majorIssues: 0,
    };
  }

  const { passed, totalChecks, issues } = complianceData.summary;
  const score = Math.round((passed / totalChecks) * 100);

  const criticalIssues = (issues || []).filter((i) => i.severity === 'critical')
    .length;
  const majorIssues = (issues || []).filter((i) => i.severity === 'major').length;

  let riskLevel = 'low';
  if (criticalIssues > 0) riskLevel = 'critical';
  else if (majorIssues > 0 || score < 70) riskLevel = 'high';
  else if (score < 85) riskLevel = 'medium';

  return {
    score,
    status: score >= 85 ? 'compliant' : score >= 70 ? 'mostly-compliant' : 'non-compliant',
    riskLevel,
    criticalIssues,
    majorIssues,
    recommendation:
      criticalIssues > 0
        ? 'Escalate to management'
        : majorIssues > 0
          ? 'Address before proceeding'
          : 'Monitor for changes',
  };
};

/**
 * Generate approval recommendations
 * @param {object} evaluationResults - Evaluation results
 * @param {array} approvals - Current approvals
 * @returns {object} Recommendations
 */
const generateApprovalRecommendations = (evaluationResults, approvals) => {
  const recommendations = {
    recommended: null,
    reasoning: [],
    risks: [],
    conditions: [],
  };

  if (!evaluationResults || !evaluationResults.topBid) {
    return {
      ...recommendations,
      reasoning: ['Insufficient evaluation data'],
    };
  }

  const topBid = evaluationResults.topBid;
  recommendations.recommended = topBid.supplier;

  // Add reasoning
  if (topBid.score > 8.5) {
    recommendations.reasoning.push('Excellent evaluation score');
  } else if (topBid.score > 7.5) {
    recommendations.reasoning.push('Good evaluation score');
  }

  if (topBid.priceRank === 1) {
    recommendations.reasoning.push('Most cost-effective option');
  } else if (topBid.priceRank <= 3) {
    recommendations.reasoning.push('Competitive pricing');
  }

  // Identify risks
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  if (pendingApprovals.length > 2) {
    recommendations.risks.push('Multiple approvals pending');
  }

  if (topBid.complianceScore < 85) {
    recommendations.risks.push('Compliance score below target');
  }

  // Recommend conditions
  if (topBid.complianceScore < 95) {
    recommendations.conditions.push('Require compliance action plan');
  }

  if (topBid.experienceLevel === 'new') {
    recommendations.conditions.push('First-time supplier - enhanced monitoring recommended');
  }

  return recommendations;
};

/**
 * Get next approval step
 * @param {string} currentStatus - Current approval status
 * @returns {object} Next steps
 */
const getNextApprovalStep = (currentStatus) => {
  const steps = {
    pending: {
      nextStep: 'awaiting_approver',
      message: 'Waiting for approver action',
      canAutomate: false,
    },
    approved: {
      nextStep: 'check_dependencies',
      message: 'Check if dependent approvals can proceed',
      canAutomate: true,
    },
    rejected: {
      nextStep: 'resubmit_or_escalate',
      message: 'Requires resubmission or escalation',
      canAutomate: false,
    },
    'changes-requested': {
      nextStep: 'make_changes',
      message: 'Changes must be made before resubmission',
      canAutomate: false,
    },
  };

  return steps[currentStatus] || steps.pending;
};

module.exports = {
  calculateWeightedScore,
  getProcurementStatus,
  validateApprovalDependencies,
  analyzeTimeline,
  analyzeApprovals,
  calculateComplianceScore,
  generateApprovalRecommendations,
  getNextApprovalStep,
};
