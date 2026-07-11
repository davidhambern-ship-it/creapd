import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FileText } from 'lucide-react';

export default function RundownScriptPanel({ item, color }) {
  const [expanded, setExpanded] = useState(false);
  const script = item.script_content || '';
  if (!script) return null;

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estSeconds = Math.ceil(script.length / 15);
  const estTime = `${Math.floor(estSeconds / 60)}:${String(estSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" style={{ color }} />
        <span style={{ color }}>Script</span>
        <span className="text-gray-600">·</span>
        <span>{wordCount} words</span>
        <span className="text-gray-600">·</span>
        <span>~{estTime}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 p-3 rounded-lg text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
              style={{
                background: `${color}08`,
                border: `1px solid ${color}20`,
              }}
            >
              {script}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}