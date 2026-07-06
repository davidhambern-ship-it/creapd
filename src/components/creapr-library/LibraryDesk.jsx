import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit3, RotateCcw, FileText, Send } from 'lucide-react';

/**
 * Library Desk — the final reveal.
 * Books organize themselves on a desk, a leather dossier materializes,
 * and the Research Assignment is displayed for approval.
 */
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
        transition={{ duration: 1 }}
      >
        {/* Desk surface */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[40%]"
          style={{
            background: 'linear-gradient(180deg, hsl(28 30% 10% / 0) 0%, hsl(25 35% 8% / 0.8) 30%, hsl(22 40% 6% / 0.95) 100%)',
          }}
          initial={{ height: 0 }}
          animate={{ height: '40%' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Books flying in and stacking */}
        {isAssembling && (
          <div className="relative flex items-end gap-2 mb-8">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="w-12 rounded-sm"
                style={{
                  height: `${60 + i * 8}px`,
                  background: `hsl(${15 + i * 30} 45% 28%)`,
                  boxShadow: '0 2px 8px hsl(0 0% 0% / 0.4)',
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
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Leather dossier styling */}
            <div
              className="rounded-lg p-6 md:p-8 backdrop-blur-md"
              style={{
                background: 'linear-gradient(135deg, hsl(28 35% 12% / 0.95) 0%, hsl(22 30% 8% / 0.98) 100%)',
                border: '1px solid hsl(35 40% 20% / 0.4)',
                boxShadow: '0 8px 32px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(40 30% 25% / 0.2)',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'hsl(35 30% 18% / 0.4)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(40 50% 30% / 0.2)' }}>
                  <FileText className="w-5 h-5" style={{ color: 'hsl(40 50% 60%)' }} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg" style={{ color: 'hsl(40 30% 90%)' }}>
                    Research Assignment
                  </h2>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'hsl(40 30% 45%)' }}>
                    Prepared by CREAPr
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
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'hsl(40 30% 45%)' }}>Supporting Questions</p>
                    <ul className="space-y-1.5">
                      {assignment.supporting_questions.map((q, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'hsl(220 10% 75%)' }}>
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'hsl(40 40% 50%)' }} />
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
              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t" style={{ borderColor: 'hsl(35 30% 18% / 0.4)' }}>
                <button
                  onClick={onApprove}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(152 60% 35%) 0%, hsl(152 55% 28%) 100%)',
                    color: 'hsl(0 0% 100%)',
                    boxShadow: '0 4px 16px hsl(152 60% 35% / 0.3)',
                  }}
                >
                  <Send className="w-4 h-4" />
                  Send to Research
                </button>
                <button
                  onClick={onEdit}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm border transition-all hover:bg-white/5"
                  style={{ borderColor: 'hsl(35 30% 25% / 0.5)', color: 'hsl(40 30% 80%)' }}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={onRestart}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm border transition-all hover:bg-white/5"
                  style={{ borderColor: 'hsl(35 30% 25% / 0.5)', color: 'hsl(220 10% 60%)' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Start Over
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
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'hsl(40 30% 45%)' }}>{label}</p>
      <p className="text-sm leading-relaxed" style={{ color: 'hsl(220 10% 78%)' }}>{value}</p>
    </div>
  );
}