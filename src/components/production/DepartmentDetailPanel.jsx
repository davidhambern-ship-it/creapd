import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { UNIVERSAL_DEPARTMENTS, getProfileDepartmentMap } from '@/lib/productionDepartments';

export default function DepartmentDetailPanel({ department, profileKey, pipeline, onClose, onSetStatus, actionLoading }) {
  const dept = UNIVERSAL_DEPARTMENTS.find(d => d.key === department);
  if (!dept) return null;

  const deptMap = getProfileDepartmentMap(profileKey);
  const profileInfo = deptMap?.[department];
  const status = pipeline?.[`${department}_status`] || 'pending';
  const output = pipeline?.[`${department}_output`];

  return (
    <AnimatePresence>
      {dept && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="cp-glass max-w-lg w-full overflow-hidden"
            style={{ borderColor: `${dept.color}30` }}
          >
            {/* Header */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${dept.color}, transparent)` }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${dept.color}12`, border: `1px solid ${dept.color}40`, boxShadow: `0 0 16px ${dept.color}20` }}
                  >
                    <span className="text-lg font-bold" style={{ color: dept.color }}>{dept.order}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{dept.name} Department</h3>
                    <p className="text-xs text-gray-400">Stage {dept.order} of 5</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mission */}
              <div className="mb-5 p-3 rounded-lg" style={{ background: `${dept.color}08`, border: `1px solid ${dept.color}15` }}>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: dept.color }}>Mission</p>
                <p className="text-sm text-gray-300">{dept.mission}</p>
              </div>

              {/* I/O */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Input</p>
                  <p className="text-sm text-white">{dept.input}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: `${dept.color}08` }}>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Output</p>
                  <p className="text-sm" style={{ color: dept.color }}>{dept.output}</p>
                </div>
              </div>

              {/* Responsibilities */}
              <div className="mb-5">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Responsibilities</p>
                <ul className="space-y-1.5">
                  {dept.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: dept.color }} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Profile-specific info */}
              {profileInfo && (
                <div className="mb-5 p-3 rounded-lg bg-white/5">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">In this Profile</p>
                  <p className="text-sm font-medium text-white">{profileInfo.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{profileInfo.description}</p>
                </div>
              )}

              {/* Current status */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs uppercase tracking-wider text-gray-500">Status:</span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full border font-medium"
                  style={{
                    background: status === 'approved' ? 'rgba(0,255,136,0.1)' : status === 'in_progress' ? `${dept.color}15` : 'rgba(255,255,255,0.05)',
                    color: status === 'approved' ? '#00FF88' : status === 'in_progress' ? dept.color : '#888',
                    borderColor: status === 'approved' ? 'rgba(0,255,136,0.3)' : status === 'in_progress' ? `${dept.color}40` : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {status}
                </span>
              </div>

              {/* Actions */}
              {status !== 'approved' && (
                <div className="flex items-center gap-2">
                  {status === 'pending' && (
                    <button
                      onClick={() => onSetStatus(department, 'in_progress')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, ${dept.color}, ${dept.color}CC)`, boxShadow: `0 0 12px ${dept.color}40` }}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Start Department'}
                    </button>
                  )}
                  {status === 'in_progress' && (
                    <button
                      onClick={() => onSetStatus(department, 'approved')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #00FF88, #00CC66)', boxShadow: '0 0 12px rgba(0,255,136,0.4)' }}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                        <span className="flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" /> Mark Approved
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {status === 'approved' && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
                  <Check className="w-4 h-4" style={{ color: '#00FF88' }} />
                  <span className="text-sm" style={{ color: '#00FF88' }}>Department approved — next department can begin.</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}