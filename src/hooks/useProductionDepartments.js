import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useProductionDepartments(profileKey, configurationId, options = {}) {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!profileKey || !configurationId) {
      setLoading(false);
      return;
    }
    try {
      const res = await base44.functions.invoke('runDepartmentPipeline', {
        action: 'get_status',
        production_profile: profileKey,
        configuration_id: configurationId,
      });
      if (res.data?.pipeline) {
        setPipeline(res.data.pipeline);
      }
    } catch (err) {
      // Pipeline doesn't exist yet — that's ok
    } finally {
      setLoading(false);
    }
  }, [profileKey, configurationId]);

  useEffect(() => {
    if (!options.defer) {
      load();
      return undefined;
    }

    let idleId = null;
    let timerId = null;
    const run = () => load();

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timerId = window.setTimeout(run, 1200);
    }

    return () => {
      if (idleId !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [load, options.defer]);

  const initPipeline = useCallback(async (productionName) => {
    if (!profileKey || !configurationId) return;
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('runDepartmentPipeline', {
        action: 'init',
        production_profile: profileKey,
        configuration_id: configurationId,
        production_name: productionName || '',
      });
      if (res.data?.pipeline) {
        setPipeline(res.data.pipeline);
      }
      return res.data?.pipeline;
    } catch (err) {
      console.error('Failed to init pipeline:', err);
    } finally {
      setActionLoading(false);
    }
  }, [profileKey, configurationId]);

  const setDepartmentStatus = useCallback(async (department, status, output) => {
    if (!pipeline) return;
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('runDepartmentPipeline', {
        action: 'set_status',
        production_profile: profileKey,
        configuration_id: configurationId,
        target_department: department,
        department_status: status,
        department_output: output,
      });
      if (res.data?.pipeline) {
        setPipeline(res.data.pipeline);
      }
      return res.data?.pipeline;
    } catch (err) {
      console.error('Failed to set department status:', err);
    } finally {
      setActionLoading(false);
    }
  }, [pipeline, profileKey, configurationId]);

  const advanceDepartment = useCallback(async (department) => {
    if (!pipeline) return;
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('runDepartmentPipeline', {
        action: 'advance_to',
        production_profile: profileKey,
        configuration_id: configurationId,
        target_department: department || undefined,
      });
      if (res.data?.pipeline) {
        setPipeline(res.data.pipeline);
      }
      return res.data?.pipeline;
    } catch (err) {
      console.error('Failed to advance department:', err);
    } finally {
      setActionLoading(false);
    }
  }, [pipeline, profileKey, configurationId]);

  return {
    pipeline,
    loading,
    actionLoading,
    initPipeline,
    setDepartmentStatus,
    advanceDepartment,
    refresh: load,
  };
}