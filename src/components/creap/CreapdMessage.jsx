import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Wrench } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { icon: Loader2, color: 'text-muted-foreground', spin: true, label: 'Queued' },
  running: { icon: Loader2, color: 'text-blue-400', spin: true, label: 'Running' },
  in_progress: { icon: Loader2, color: 'text-blue-400', spin: true, label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', spin: false, label: 'Done' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', spin: false, label: 'Done' },
  failed: { icon: XCircle, color: 'text-destructive', spin: false, label: 'Failed' },
  error: { icon: XCircle, color: 'text-destructive', spin: false, label: 'Error' },
};

function formatToolName(name) {
  if (!name) return 'Action';
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  const rawStatus = toolCall.status || 'pending';
  let status = rawStatus;
  let isFailed = ['failed', 'error'].includes(rawStatus);

  let parsedResults = null;
  if (toolCall.results) {
    try {
      parsedResults = typeof toolCall.results === 'string'
        ? JSON.parse(toolCall.results)
        : toolCall.results;
    } catch {
      parsedResults = toolCall.results;
    }
    if (typeof parsedResults === 'string' && /error|failed/i.test(parsedResults)) {
      isFailed = true;
      status = 'failed';
    }
    if (parsedResults && typeof parsedResults === 'object' && parsedResults.success === false) {
      isFailed = true;
      status = 'failed';
    }
  }

  if (isFailed && status !== 'failed' && status !== 'error') {
    status = 'failed';
  }

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  // Honor display_projection hide mode
  const proj = toolCall.display_projection;
  const hideDetails = proj?.hide_details && proj?.details_redacted;

  let label = formatToolName(toolCall.name);
  if (proj?.label && status === 'success') label = proj.label;
  else if (proj?.active_label && ['pending', 'running', 'in_progress'].includes(status)) label = proj.active_label;
  else if (proj?.error_label && isFailed) label = proj.error_label;

  let parsedArgs = null;
  if (toolCall.arguments_string) {
    try {
      parsedArgs = JSON.parse(toolCall.arguments_string);
    } catch {
      parsedArgs = toolCall.arguments_string;
    }
  }

  return (
    <div className="mt-1.5 rounded-lg border border-border bg-secondary/40 overflow-hidden">
      <button
        onClick={() => !hideDetails && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left ${hideDetails ? 'cursor-default' : 'hover:bg-secondary/60'}`}
        disabled={hideDetails}
      >
        <Icon className={`w-3.5 h-3.5 shrink-0 ${config.spin ? 'animate-spin' : ''} ${config.color}`} />
        <Wrench className="w-3 h-3 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium flex-1 truncate">{label}</span>
        <span className={`text-[10px] uppercase tracking-wide font-mono ${config.color}`}>{config.label}</span>
        {!hideDetails && expanded && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        {!hideDetails && !expanded && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
      </button>
      {expanded && !hideDetails && (
        <div className="px-2.5 pb-2 space-y-1.5">
          {parsedArgs && Object.keys(parsedArgs).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono mb-0.5">Parameters</p>
              <pre className="text-[10px] font-mono text-muted-foreground bg-background/50 rounded p-1.5 overflow-x-auto max-h-32">
                {JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono mb-0.5">Result</p>
              <pre className={`text-[10px] font-mono rounded p-1.5 overflow-x-auto max-h-40 ${isFailed ? 'text-destructive bg-destructive/10' : 'text-emerald-400/80 bg-background/50'}`}>
                {typeof parsedResults === 'string' ? parsedResults : JSON.stringify(parsedResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreapdMessage({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary text-primary-foreground px-3 py-1.5">
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] w-full">
        {message.content && (
          <div className="rounded-lg rounded-bl-sm bg-secondary text-secondary-foreground px-3 py-2">
            <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.tool_calls?.map((tc, idx) => (
          <ToolCallDisplay key={idx} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}