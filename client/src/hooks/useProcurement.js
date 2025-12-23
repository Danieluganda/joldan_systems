import { useState, useCallback, useEffect } from 'react';

export const useProcurement = (procurementId = null) => {
  const [procurements, setProcurements] = useState([]);
  const [currentProcurement, setCurrentProcurement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all procurements
  const fetchProcurements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/procurements');
      if (!response.ok) throw new Error('Failed to fetch procurements');
      const data = await response.json();
      setProcurements(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching procurements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single procurement
  const fetchProcurement = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/procurements/${id}`);
      if (!response.ok) throw new Error('Failed to fetch procurement');
      const data = await response.json();
      setCurrentProcurement(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching procurement:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create procurement
  const createProcurement = useCallback(async (procurementData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/procurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(procurementData)
      });
      if (!response.ok) throw new Error('Failed to create procurement');
      const data = await response.json();
      setProcurements([...procurements, data]);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error creating procurement:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [procurements]);

  // Update procurement
  const updateProcurement = useCallback(async (id, procurementData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/procurements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(procurementData)
      });
      if (!response.ok) throw new Error('Failed to update procurement');
      const data = await response.json();
      setProcurements(procurements.map(p => p.id === id ? data : p));
      if (currentProcurement?.id === id) setCurrentProcurement(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating procurement:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [procurements, currentProcurement]);

  // Delete procurement
  const deleteProcurement = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/procurements/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete procurement');
      setProcurements(procurements.filter(p => p.id !== id));
      if (currentProcurement?.id === id) setCurrentProcurement(null);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting procurement:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [procurements, currentProcurement]);

  // Get procurement status
  const getProcurementStatus = useCallback((procurementId) => {
    const procurement = procurements.find(p => p.id === procurementId);
    if (!procurement) return null;
    return {
      ...procurement,
      statusLabel: procurement.status === 'active' ? 'Active' : 
                   procurement.status === 'planning' ? 'Planning' :
                   procurement.status === 'completed' ? 'Completed' : 'Unknown',
      percentComplete: calculateProgress(procurement)
    };
  }, [procurements]);

  // Calculate procurement progress
  const calculateProgress = (procurement) => {
    const stages = ['planning', 'rfq', 'submission', 'evaluation', 'award', 'contract', 'completed'];
    const currentIndex = stages.indexOf(procurement.currentStage || 'planning');
    return Math.round(((currentIndex + 1) / stages.length) * 100);
  };

  // Auto-fetch on mount if procurementId provided
  useEffect(() => {
    if (procurementId) {
      fetchProcurement(procurementId);
    } else {
      fetchProcurements();
    }
  }, [procurementId, fetchProcurement, fetchProcurements]);

  return {
    procurements,
    currentProcurement,
    loading,
    error,
    fetchProcurements,
    fetchProcurement,
    createProcurement,
    updateProcurement,
    deleteProcurement,
    getProcurementStatus,
    calculateProgress
  };
};

export default useProcurement;
