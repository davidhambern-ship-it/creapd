import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Send, Edit3, RotateCcw, FileText, Map, StickyNote } from 'lucide-react';

const BOOK_COLORS = [
  'hsl(350 32% 28%)', 'hsl(140 22% 24%)', 'hsl(210 32% 24%)',
  'hsl(35 38% 30%)', 'hsl(180 22% 24%)',
];

function AssignmentField({ label, value, serif, small }) {
  if (!value) return null;
  return (
    <div className={small ? 'mb-2' : 'mb-3'}>
      <p
        className="text-[10px] uppercase tracking-wider mb-0.5"
        style={{ color: 'hsl(30 25% 42%)', fontFamily: '"Oswald", sans-serif' }}
      >
        {label}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{
          color: 'hsl(30 20% 20%)',
          fontFamily: serif ? 'Georgia, serif' : '"Inter", sans-serif',
          fontWeight: serif ? 400 : 500,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function LibraryResearchTable({ assignment, phase, onApprove, onEdit, onRestart }) {
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
        transition={{ duration: 0.6 }}
      >
        {/* Table surface rising */}
        <motion.div
          className="absolute bottom-9 left-0 right-0"
          style={{
            height: '50%',
            background: 'linear-gradient(180deg, hsl(28 20% 13% / 0) 0%, hsl(28 18% 9% / 0.6) 25%, hsl(28 16% 6% / 0.85) 100%)',
            borderTop: '1px solid hsl(35 20% 20% / 0.2)',
          }}
          initial={{ height: 0 }}
          animate={{ height: '50%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Assembling — materials gathering on table */}
        {isAssembling && (
          <div className="relative flex items-end gap-3 mb-8">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="rounded-sm"
                style={{
                  width: '44px',
                  height: `${46 + i * 10}px`,
                  background: `linear-gradient(180deg, ${BOOK_COLORS[i]} 0%, hsl(0 0% 0% / 0.3) 100%)`,
                  boxShadow: '0 4px 12px hsl(0 0% 0% / 0.3)',
                }}
                initial={{ y: -200, opacity: 0, rotate: -5 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: i * 0.25, duration: 0.5, type: 'spring', bounce: 0.25 }}
              />
            ))}
            {/* Small decorative elements */}
            <motion.div
              className="flex flex-col gap-1 ml-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              <FileText className="w-5 h-5" style={{ color: 'hsl(35 20% 40%)' }} />
              <Map className="w-5 h-5" style={{ color: 'hsl(35 20% 40%)' }} />
              <StickyNote className="w-5 h-5" style={{ color: 'hsl(35 20% 40%)' }} />
            </motion.div>
          </div>
        )}

        {/* Reveal — open book with assignment */}
        {isReveal && assignment && (
          <motion.div
            className="relative w-full max-w-2xl my-8 plib-table-surface p-6 md:p-8"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'hsl(35 18% 20% / 0.3)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(38 45% 38% / 0.15)', border: '1px solid hsl(38 35% 33% / 0.3)' }}>
                <BookOpen className="w-5 h-5" style={{ color: 'hsl(38 50% 52%)' }} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-lg" style={{ color: 'hsl(35 18% 88%)' }}>
                  Research Assignment
                </h2>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'hsl(40 25% 48%)', fontFamily: '"Oswald", sans-serif' }}>
                  Compiled by CREAPr
                </p>
              </div>
            </div>

            {/* Open book — left and right pages */}
            <div className="flex gap-0 mb-6 rounded overflow-hidden">
              {/* Left page — overview */}
              <div className="plib-book-page plib-book-page-left">
                <AssignmentField label="Title" value={assignment.title} serif />
                <AssignmentField label="Objective" value={assignment.objective} serif />
                <AssignmentField label="Primary Research Question" value={assignment.primary_research_question} serif />
              </div>
              <div className="plib-book-spine-center" />
              {/* Right page — refinement & details */}
              <div className="plib-book-page plib-book-page-right">
                {assignment.supporting_questions?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'hsl(30 25% 42%)', fontFamily: '"Oswald", sans-serif' }}>Supporting Questions</p>
                    <ul className="space-y-1">
                      {assignment.supporting_questions.map((q, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'hsl(30 18% 25%)', fontFamily: 'Georgia, serif' }}>
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'hsl(38 45% 38%)' }} />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <AssignmentField label="Scope" value={assignment.scope} small />
                  <AssignmentField label="Audience" value={assignment.audience} small />
                  <AssignmentField label="Intent" value={assignment.intent} small />
                  <AssignmentField label="Depth" value={assignment.research_depth} small />
                </div>
                {assignment.deliverables && <AssignmentField label="Deliverables" value={assignment.deliverables} small />}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t" style={{ borderColor: 'hsl(35 18% 20% / 0.3)' }}>
              <button
                onClick={onApprove}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, hsl(152 42% 32%) 0%, hsl(152 38% 25%) 100%)',
                  color: 'hsl(0 0% 100%)',
                  boxShadow: '0 4px 16px hsl(152 42% 32% / 0.25)',
                  border: '1px solid hsl(152 42% 38% / 0.4)',
                }}
              >
                <Send className="w-4 h-4" />
                Approve &amp; Research
              </button>
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border transition-all hover:bg-white/5"
                style={{ borderColor: 'hsl(35 25% 30% / 0.4)', color: 'hsl(35 25% 68%)' }}
              >
                <Edit3 className="w-4 h-4" />
                Refine
              </button>
              <button
                onClick={onRestart}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border transition-all hover:bg-white/5"
                style={{ borderColor: 'hsl(35 10% 25% / 0.4)', color: 'hsl(35 10% 58%)' }}
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}