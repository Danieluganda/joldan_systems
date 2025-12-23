import { useState, useCallback, useEffect } from 'react';

export const useAuditLog = (procurementId = null, options = {}) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: options.action || null,
    actor: options.actor || null,
    dateFrom: options.dateFrom || null,
    dateTo: options.dateTo || null,
    resource: options.resource || null
  });

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (procId) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (procId) params.append('procurementId', procId);
      if (filters.action) params.append('action', filters.action);
      if (filters.actor) params.append('actor', filters.actor);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.resource) params.append('resource', filters.resource);

      const response = await fetch(`/api/audits/logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setLogs(data);
      applyFilters(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Apply filters
  const applyFilters = useCallback((logsToFilter) => {
    let filtered = [...logsToFilter];

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }
    if (filters.actor) {
      filtered = filtered.filter(log => log.actor.toLowerCase().includes(filters.actor.toLowerCase()));
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(filters.dateTo));
    }
    if (filters.resource) {
      filtered = filtered.filter(log => log.resource === filters.resource);
    }

    setFilteredLogs(filtered);
  }, [filters]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      action: null,
      actor: null,
      dateFrom: null,
      dateTo: null,
      resource: null
    });
    setFilteredLogs(logs);
  }, [logs]);

  // Get logs by action
  const getLogsByAction = useCallback((action) => {
    return logs.filter(log => log.action === action);
  }, [logs]);

  // Get logs by actor
  const getLogsByActor = useCallback((actor) => {
    return logs.filter(log => log.actor === actor);
  }, [logs]);

  // Get logs by resource
  const getLogsByResource = useCallback((resource) => {
    return logs.filter(log => log.resource === resource);
  }, [logs]);

  // Get unique actors
  const getUniqueActors = useCallback(() => {
    const actors = new Set(logs.map(log => log.actor));
    return Array.from(actors);
  }, [logs]);

  // Get unique actions
  const getUniqueActions = useCallback(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions);
  }, [logs]);

  // Export logs as CSV
  const exportLogs = useCallback((format = 'csv') => {
    let content = '';
    if (format === 'csv') {
      const headers = ['Timestamp', 'Action', 'Actor', 'Resource', 'Details', 'Status'];
      content = headers.join(',') + '\n';
      filteredLogs.forEach(log => {
        const row = [
          log.timestamp,
          log.action,
          log.actor,
          log.resource,
          `"${log.details || ''}"`,
          log.status || 'completed'
        ].join(',');
        content += row + '\n';
      });
    }

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/${format},${encodeURIComponent(content)}`);
    element.setAttribute('download', `audit-logs.${format}`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [filteredLogs]);

  // Generate audit summary
  const generateAuditSummary = useCallback(() => {
    return {
      totalActions: logs.length,
      dateRange: {
        from: logs.length ? logs[logs.length - 1].timestamp : null,
        to: logs.length ? logs[0].timestamp : null
      },
      actionBreakdown: Object.fromEntries(
        Array.from(new Set(logs.map(l => l.action))).map(action => [
          action,
          logs.filter(l => l.action === action).length
        ])
      ),
      actorSummary: Object.fromEntries(
        Array.from(new Set(logs.map(l => l.actor))).map(actor => [
          actor,
          logs.filter(l => l.actor === actor).length
        ])
      )
    };
  }, [logs]);

  // Auto-fetch on mount
  useEffect(() => {
    if (procurementId) {
      fetchAuditLogs(procurementId);
    }
  }, [procurementId, fetchAuditLogs]);

  // Re-apply filters when filters change
  useEffect(() => {
    applyFilters(logs);
  }, [filters, applyFilters, logs]);

  return {
    logs,
    filteredLogs,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    fetchAuditLogs,
    getLogsByAction,
    getLogsByActor,
    getLogsByResource,
    getUniqueActors,
    getUniqueActions,
    exportLogs,
    generateAuditSummary
  };
};

export default useAuditLog;
