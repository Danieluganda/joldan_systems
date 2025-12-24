// evaluationFormulas.js
// QCBS/LCS/FBS formulas

module.exports = {
  qcbs: (techScore, finScore, techWeight = 0.8, finWeight = 0.2) => {
    return techScore * techWeight + finScore * finWeight;
  },
  lcs: (prices) => {
    // Lowest Cost Selection
    return Math.min(...prices);
  },
  fbs: (scores) => {
    // Fixed Budget Selection
    return scores.filter(s => s <= 100);
  }
};
