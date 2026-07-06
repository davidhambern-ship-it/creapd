import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit3, RotateCcw, FileText, Send, Terminal } from 'lucide-react';

export default function LibraryDesk({ assignment, phase, onApprove, onEdit, onRestart }) {
  const isAssembling = phase === 'assembling';
  const isReveal = phase === 'reveal';

  if (!isAssembling && !isReveal) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto"
        style={{ zIndex: 30 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Digital desk surface */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[40%]"
          style={{
            background: 'linear-gradient(180deg, hsl(220 40% 8% / 0) 0%, hsl(220 35% 5% / 0.8) 30%, hsl(220 40% 3% / 0.95) 100%)',
            borderTop: '1px solid hsl(190 60% 30% / 0.2)',
          }}
          initial={{ height: 0 }}
          animate={{ height: '40%' }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Data shards assembling */}
        {isAssembling && (
          <div className="relative flex items-end gap-2 mb-8">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="w-12 rounded-sm"
                style={{
                  height: `${60 + i * 8}px`,
                  background: `linear-gradient(180deg, hsl(${190 + i * 20} 80% 50%) 0%, hsl(${190 + i * 20} 70% 35%) 100%)`,
                  boxShadow: `0 0 12px hsl(${190 + i * 20} 80% 50% / 0.3), 0 2px 8px hsl(0 0% 0% / 0.4)`,
                }}
                initial={{ y: -300, opacity: 0, rotate: -10 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: i * 0.3, duration: 0.6, type: 'spring', bounce: 0.3 }}
              />
            ))}
          </div>
        )}

        {/* Dossier reveal */}
        {isReveal && assignment && (
          <motion.div
            className="relative w-full max-w-2xl my-8"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Digital dossier panel */}
            <div
              className="rounded-lg p-6 md:p-8 backdrop-blur-md relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(220 40% 6% / 0.95) 0%, hsl(220 35% 4% / 0.98) 100%)',
                border: '1px solid hsl(190 60% 35% / 0.35)',
                boxShadow: '0 8px 32px hsl(0 0% 0% / 0.5), 0 0 20px hsl(270 80% 50% / 0.08), inset 0 1px 0 hsl(190 50% 30% / 0.15)',
              }}
            >
              {/* Top scan line */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(190 90% 55% / 0.5), transparent)' }}
              />
              {/* Corner accents */}
              <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2" style={{ borderColor: 'hsl(190 90% 55% / 0.5)' }} />
              <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2" style={{ borderColor: 'hsl(190 90% 55% / 0.5)' }} />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2" style={{ borderColor: 'hsl(190 90% 55% / 0.5)' }} />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2" style={{ borderColor: 'hsl(190 90% 55% / 0.5)' }} />

              {/* Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'hsl(190 60% 30% / 0.3)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 90% 45% / 0.15)', border: '1px solid hsl(190 60% 40% / 0.3)' }}>
                  <Terminal className="w-5 h-5" style={{ color: 'hsl(190 90% 55%)' }} />
                </div>
                <div>
                  <h2 className="font-mono font-bold text-lg uppercase tracking-wider" style={{ color: 'hsl(0 0% 92%)' }}>
                    Research Assignment
                  </h2>
                  <p className="text-xs uppercase tracking-wider font-mono" style={{ color: 'hsl(190 60% 45%)' }}>
                    ▸ Compiled by CREAPr
                  </p>
                </div>
              </div>

              {/* Assignment fields */}
              <div className="space-y-4">
                <AssignmentField label="Title" value={assignment.title} />
                <AssignmentField label="Objective" value={assignment.objective} />
                <AssignmentField label="Primary Research Question" value={assignment.primary_research_question} />
                {assignment.supporting_questions?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2 font-mono" style={{ color: 'hsl(190 60% 45%)' }}>Supporting Questions</p>
                    <ul className="space-y-1.5">
                      {assignment.supporting_questions.map((q, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 font-mono" style={{ color: 'hsl(220 15% 75%)' }}>
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'hsl(190 90% 55%)', boxShadow: '0 0 4px hsl(190 90% 55%)' }} />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <AssignmentField label="Scope" value={assignment.scope} />
                  <AssignmentField label="Audience" value={assignment.audience} />
                  <AssignmentField label="Intent" value={assignment.intent} />
                  <AssignmentField label="Research Depth" value={assignment.research_depth} />
                </div>
                <AssignmentField label="Deliverables" value={assignment.deliverables} />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t" style={{ borderColor: 'hsl(190 60% 30% / 0.3)' }}>
                <button
                  onClick={onApprove}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-mono font-medium text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(152 60% 35%) 0%, hsl(152 55% 28%) 100%)',
                    color: 'hsl(0 0% 100%)',
                    boxShadow: '0 4px 16px hsl(152 60% 35% / 0.3), inset 0 1px 0 hsl(152 60% 45% / 0.3)',
                    border: '1px solid hsl(152 60% 40% / 0.4)',
                  }}
                >
                  <Send className="w-4 h-4" />
                  Deploy Research
                </button>
                <button
                  onClick={onEdit}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-mono font-medium text-sm uppercase tracking-wider border transition-all hover:bg-white/5"
                  style={{ borderColor: 'hsl(190 60% 35% / 0.4)', color: 'hsl(190 60% 70%)' }}
                >
                  <Edit3 className="w-4 h-4" />
                  Modify
                </button>
                <button
                  onClick={onRestart}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-mono font-medium text-sm uppercase tracking-wider border transition-all hover:bg-white/5"
                  style={{ borderColor: 'hsl(220 15% 30% / 0.4)', color: 'hsl(220 15% 60%)' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function AssignmentField({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider mb-1 font-mono" style={{ color: 'hsl(190 60% 45%)' }}>▸ {label}</p>
      <p className="text-sm leading-relaxed font-mono" style={{ color: 'hsl(220 15% 78%)' }}>{value}</p>
    </div>
  );
}