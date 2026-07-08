import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Compass, Database, ClipboardList, Sparkles, Package,
  Check, Loader2, ChevronRight, Circle
} from 'lucide-react';
import { UNIVERSAL_DEPARTMENTS, getProfileDepartmentMap } from '@/lib/productionDepartments';

const ICON_MAP = { Compass, Database, ClipboardList, Sparkles, Package };

export default function DepartmentWorkflowBar({ profileKey, pipeline, loading, onAdvance, actionLoading, compact = false }) {
  const deptMap = getProfileDepartmentMap(profileKey);

  // Auto-init pipeline if needed
  useEffect(() => {
    if (!loading && !pipeline) {
      // Parent should handle init
    }
  }, [loading, pipeline]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading pipeline...
      </div>
    );
  }

  const getStatus = (deptKey) => {
    if (!pipeline) return 'pending';
    return pipeline[`${deptKey}_status`] || 'pending';
  };

  return (
    <div className="cp-glass overflow-hidden" style={{ borderColor: 'rgba(255,0,255,0.15)' }}>
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #00FFFF, #8B00FF, #FF00FF, #FF6B00, #00FF88)' }} />

      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-gray-400">Production Pipeline</span>
            {pipeline && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
                style={{ background: 'rgba(255,0,255,0.1)', color: '#FF00FF', borderColor: 'rgba(255,0,255,0.3)' }}>
                {pipeline.pipeline_progress}%
              </span>
            )}
          </div>
          {pipeline?.pipeline_status === 'completed' && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#00FF88' }}>
              <Check className="w-3.5 h-3.5" /> Pipeline Complete
            </span>
          )}
        </div>

        {/* Department nodes */}
        <div className="flex items-stretch gap-1 md:gap-2 overflow-x-auto pb-1">
          {UNIVERSAL_DEPARTMENTS.map((dept, i) => {
            const Icon = ICON_MAP[dept.icon] || Circle;
            const status = getStatus(dept.key);
            const isActive = pipeline?.current_department === dept.key;
            const profileInfo = deptMap?.[dept.key];

            const color = dept.color;
            const isApproved = status === 'approved' || status === 'skipped';
            const isInProgress = status === 'in_progress';
            const isPending = status === 'pending';

            return (
              <React.Fragment key={dept.key}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex-shrink-0"
                  style={{ minWidth: compact ? '120px' : '160px' }}
                >
                  {profileInfo ? (
                    <Link to={profileInfo.path} className="block">
                      <DepartmentNode
                        dept={dept}
                        icon={Icon}
                        status={status}
                        isActive={isActive}
                        color={color}
                        isApproved={isApproved}
                        isInProgress={isInProgress}
                        isPending={isPending}
                        profileInfo={profileInfo}
                        onAdvance={onAdvance}
                        actionLoading={actionLoading}
                        compact={compact}
                      />
                    </Link>
                  ) : (
                    <DepartmentNode
                      dept={dept}
                      icon={Icon}
                      status={status}
                      isActive={isActive}
                      color={color}
                      isApproved={isApproved}
                      isInProgress={isInProgress}
                      isPending={isPending}
                      onAdvance={onAdvance}
                      actionLoading={actionLoading}
                      compact={compact}
                    />
                  )}
                </motion.div>

                {/* Connector arrow */}
                {i < UNIVERSAL_DEPARTMENTS.length - 1 && (
                  <div className="flex items-center flex-shrink-0">
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: i * 0.08 + 0.1 }}
                      className="w-4 md:w-6 h-px"
                      style={{
                        background: isApproved ? color : 'rgba(255,255,255,0.1)',
                        boxShadow: isApproved ? `0 0 4px ${color}80` : 'none',
                      }}
                    />
                    <ChevronRight
                      className="w-3 h-3"
                      style={{ color: isApproved ? color : 'rgba(255,255,255,0.15)' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DepartmentNode({ dept, icon: Icon, status, isActive, color, isApproved, isInProgress, isPending, profileInfo, onAdvance, actionLoading, compact }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border p-3 transition-all cursor-pointer group"
      style={{
        background: isActive ? `${color}08` : 'rgba(255,255,255,0.02)',
        borderColor: isActive ? `${color}40` : isApproved ? `${color}30` : 'rgba(255,255,255,0.06)',
        boxShadow: isActive ? `0 0 16px ${color}15` : 'none',
      }}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{
            background: `${color}12`,
            border: `1px solid ${color}40`,
            boxShadow: isApproved || isActive ? `0 0 8px ${color}40` : 'none',
          }}
        >
          {isApproved ? (
            <Check className="w-4 h-4" style={{ color }} />
          ) : isInProgress ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
          ) : (
            <Icon className="w-4 h-4" style={{ color }} />
          )}
        </div>
        <span className="text-[10px] font-mono text-gray-500">{dept.order}</span>
      </div>

      {/* Department name */}
      <p
        className="text-xs font-semibold mb-0.5"
        style={{ color: isPending ? '#888' : color }}
      >
        {dept.name}
      </p>

      {/* Profile-specific label */}
      {profileInfo && !compact && (
        <p className="text-[11px] text-gray-400 mb-1">{profileInfo.label}</p>
      )}

      {/* Status text */}
      <p className="text-[10px] uppercase tracking-wider" style={{
        color: isApproved ? '#00FF88' : isInProgress ? color : '#555',
      }}>
        {status === 'pending' && 'Pending'}
        {status === 'in_progress' && 'Running'}
        {status === 'approved' && 'Approved'}
        {status === 'skipped' && 'Skipped'}
      </p>

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}08, transparent)` }}
      />
    </div>
  );
}