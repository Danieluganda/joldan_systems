/**
 * Versioning Engine - Feature 4: Document Version Control
 * 
 * Manages document versioning, change tracking, version history,
 * file hashing for integrity, and rollback capabilities
 */

const crypto = require('crypto');

class VersioningEngine {
  /**
   * Create new version of document
   * @param {object} document - Original document
   * @param {string} content - New content/file data
   * @param {object} changeMetadata - {changedBy, changeReason, timestamp}
   * @returns {object} New version object
   */
  static createVersion(document, content, changeMetadata = {}) {
    const fileHash = this.generateFileHash(content);
    const timestamp = changeMetadata.timestamp || new Date();
    
    // Check if content actually changed
    const contentChanged = !document.currentHash || document.currentHash !== fileHash;
    
    if (!contentChanged) {
      return {
        created: false,
        reason: 'No content changes detected',
        currentHash: fileHash,
      };
    }

    const newVersion = {
      versionNumber: (document.versionNumber || 0) + 1,
      timestamp,
      changedBy: changeMetadata.changedBy || 'system',
      changeReason: changeMetadata.changeReason || 'Document updated',
      fileHash,
      fileSize: content.length,
      changeDetails: this.detectChanges(document.content, content),
      changeType: this.categorizeChange(document, changeMetadata),
      approvalStatus: 'pending',
      notes: changeMetadata.notes || '',
    };

    return {
      created: true,
      version: newVersion,
      previousHash: document.currentHash,
      newHash: fileHash,
    };
  }

  /**
   * Generate SHA256 hash of file content
   * @param {string|Buffer} content
   * @returns {string} Hex hash
   */
  static generateFileHash(content) {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Verify file integrity using hash
   * @param {string|Buffer} content
   * @param {string} expectedHash
   * @returns {object} {valid: boolean, hash: string}
   */
  static verifyIntegrity(content, expectedHash) {
    const calculatedHash = this.generateFileHash(content);
    return {
      valid: calculatedHash === expectedHash,
      expectedHash,
      calculatedHash,
      match: calculatedHash === expectedHash,
    };
  }

  /**
   * Detect specific changes between versions
   * @private
   */
  static detectChanges(oldContent = '', newContent = '') {
    const oldLines = oldContent ? oldContent.split('\n') : [];
    const newLines = newContent.split('\n');

    const added = newLines.length - oldLines.length;
    const removed = oldLines.length - newLines.length > 0 ? oldLines.length - newLines.length : 0;

    // Simple diff detection
    const changes = [];
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      if (oldLines[i] !== newLines[i]) {
        if (oldLines[i]) {
          changes.push({ type: 'modified', line: i + 1 });
        }
      }
    }

    return {
      linesAdded: Math.max(0, added),
      linesRemoved: Math.max(0, removed),
      totalChanges: changes.length,
      changeDetails: changes,
    };
  }

  /**
   * Categorize type of change
   * @private
   */
  static categorizeChange(document, metadata = {}) {
    const reason = (metadata.changeReason || '').toLowerCase();

    if (reason.includes('correction') || reason.includes('fix')) return 'correction';
    if (reason.includes('clarification')) return 'clarification';
    if (reason.includes('template') || reason.includes('format')) return 'formatting';
    if (reason.includes('approval')) return 'approval';
    if (reason.includes('amendment') || reason.includes('amend')) return 'amendment';
    if (reason.includes('minor')) return 'minor';

    return 'update';
  }

  /**
   * Get version history for document
   * @param {object} document - Document with versions array
   * @returns {array} Sorted version history
   */
  static getVersionHistory(document = {}) {
    const versions = document.versions || [];
    return versions
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v, index) => ({
        ...v,
        isCurrent: index === 0,
        isLatest: index === 0,
      }));
  }

  /**
   * Get specific version
   * @param {object} document
   * @param {number} versionNumber
   * @returns {object|null}
   */
  static getVersion(document, versionNumber) {
    const versions = document.versions || [];
    return versions.find(v => v.versionNumber === versionNumber) || null;
  }

  /**
   * Rollback to previous version
   * @param {object} document
   * @param {number} targetVersionNumber
   * @param {object} rollbackMetadata - {rolledBackBy, reason}
   * @returns {object} {success: boolean, message: string, previousVersion?: object}
   */
  static rollback(document, targetVersionNumber, rollbackMetadata = {}) {
    const targetVersion = this.getVersion(document, targetVersionNumber);

    if (!targetVersion) {
      return {
        success: false,
        message: `Version ${targetVersionNumber} not found`,
      };
    }

    if (targetVersionNumber >= document.versionNumber) {
      return {
        success: false,
        message: 'Cannot rollback to current or future version',
      };
    }

    return {
      success: true,
      message: `Rolled back to version ${targetVersionNumber}`,
      previousVersion: targetVersion,
      rollbackMetadata: {
        rolledBackBy: rollbackMetadata.rolledBackBy || 'system',
        reason: rollbackMetadata.reason || 'Manual rollback',
        timestamp: new Date(),
        fromVersion: document.versionNumber,
        toVersion: targetVersionNumber,
      },
    };
  }

  /**
   * Compare two versions
   * @param {object} document
   * @param {number} versionA
   * @param {number} versionB
   * @returns {object} Comparison details
   */
  static compareVersions(document, versionA, versionB) {
    const verA = this.getVersion(document, versionA);
    const verB = this.getVersion(document, versionB);

    if (!verA || !verB) {
      return {
        error: 'One or both versions not found',
      };
    }

    return {
      versionA: versionA,
      versionB: versionB,
      timestampA: verA.timestamp,
      timestampB: verB.timestamp,
      changedByA: verA.changedBy,
      changedByB: verB.changedBy,
      hashesMatch: verA.fileHash === verB.fileHash,
      changeTypeA: verA.changeType,
      changeTypeB: verB.changeType,
      changeDetailsA: verA.changeDetails,
      changeDetailsB: verB.changeDetails,
    };
  }

  /**
   * Validate version chain integrity
   * @param {object} document
   * @returns {object} {valid: boolean, invalidVersions: array}
   */
  static validateVersionChain(document = {}) {
    const versions = document.versions || [];
    const invalidVersions = [];

    // Check version numbers are sequential
    const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
    for (let i = 0; i < sortedVersions.length; i++) {
      if (sortedVersions[i].versionNumber !== i + 1) {
        invalidVersions.push({
          version: sortedVersions[i].versionNumber,
          issue: 'Version numbers are not sequential',
        });
      }
    }

    // Check all versions have required fields
    versions.forEach(v => {
      const missingFields = [];
      if (!v.versionNumber) missingFields.push('versionNumber');
      if (!v.timestamp) missingFields.push('timestamp');
      if (!v.fileHash) missingFields.push('fileHash');
      if (!v.changedBy) missingFields.push('changedBy');

      if (missingFields.length > 0) {
        invalidVersions.push({
          version: v.versionNumber,
          issue: `Missing fields: ${missingFields.join(', ')}`,
        });
      }
    });

    return {
      valid: invalidVersions.length === 0,
      invalidVersions,
      totalVersions: versions.length,
    };
  }

  /**
   * Get version statistics
   * @param {object} document
   * @returns {object} Statistics about versions
   */
  static getVersionStatistics(document = {}) {
    const versions = document.versions || [];

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        message: 'No versions found',
      };
    }

    const changeTypes = {};
    const changedByUsers = {};
    let totalChanges = 0;

    versions.forEach(v => {
      changeTypes[v.changeType] = (changeTypes[v.changeType] || 0) + 1;
      changedByUsers[v.changedBy] = (changedByUsers[v.changedBy] || 0) + 1;
      if (v.changeDetails) {
        totalChanges += v.changeDetails.totalChanges || 0;
      }
    });

    return {
      totalVersions: versions.length,
      firstVersion: versions[0]?.timestamp,
      lastVersion: versions[versions.length - 1]?.timestamp,
      changeTypeBreakdown: changeTypes,
      contributorBreakdown: changedByUsers,
      totalChanges,
      averageChangesPerVersion: Math.round(totalChanges / versions.length),
      versionsAwaitingApproval: versions.filter(v => v.approvalStatus === 'pending').length,
    };
  }

  /**
   * Mark version as approved
   * @param {object} document
   * @param {number} versionNumber
   * @param {string} approvedBy
   * @returns {object} Updated version
   */
  static approveVersion(document, versionNumber, approvedBy = 'system') {
    const version = this.getVersion(document, versionNumber);
    if (!version) {
      return {
        success: false,
        message: `Version ${versionNumber} not found`,
      };
    }

    version.approvalStatus = 'approved';
    version.approvedBy = approvedBy;
    version.approvalDate = new Date();

    return {
      success: true,
      version,
    };
  }

  /**
   * Get approval status of versions
   * @param {object} document
   * @returns {array} Versions with approval status
   */
  static getApprovalStatus(document = {}) {
    const versions = document.versions || [];
    return versions
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map(v => ({
        versionNumber: v.versionNumber,
        approvalStatus: v.approvalStatus,
        approvedBy: v.approvedBy,
        approvalDate: v.approvalDate,
        changedBy: v.changedBy,
        timestamp: v.timestamp,
      }));
  }

  /**
   * Export version as snapshot
   * @param {object} document
   * @param {number} versionNumber
   * @returns {object} Version snapshot
   */
  static exportVersion(document, versionNumber) {
    const version = this.getVersion(document, versionNumber);
    if (!version) {
      return {
        error: `Version ${versionNumber} not found`,
      };
    }

    return {
      documentId: document.id,
      documentName: document.name,
      versionNumber,
      exportDate: new Date(),
      ...version,
    };
  }
}

module.exports = VersioningEngine;
