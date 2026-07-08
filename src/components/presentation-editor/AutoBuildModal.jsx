import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2, Sparkles, AlertCircle, CheckCircle2, Circle,
  RotateCcw, ArrowRight, Wand2,
} from 'lucide-react';

export default function AutoBuildModal({
  isOpen, onClose,
  prompt, onPromptChange,
  stages, stageStatuses, detail,
  error, failedStage, onRetry,
  running,
  needsConfirmation, clarificationQuestion,
  inferredParams,
  onStart, onConfirmProceed,
}) {
  const stageOrder = stages.map(s => s.id);
  const currentStageIdx = stageOrder.findIndex(
    id => stageStatuses[id] === 'running'
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !running) onClose(); }}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-base font-heading font-bold">Auto-Build Presentation</div>
              <div className="text-xs text-muted-foreground font-normal">CREAPr AI Executive Producer</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ── Prompt Input (idle state) ── */}
        {Object.keys(stageStatuses).length === 0 && !needsConfirmation && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-berna-purple/10 to-transparent border border-berna-purple/20">
              <div className="w-7 h-7 rounded-full bg-berna-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-berna-purple" />
              </div>
              <div>
                <p className="text-sm font-medium">What's the presentation?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe your topic in natural language. CREAPr will interpret your request,
                  research the subject, and build a fully editable presentation.
                </p>
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={3}
              placeholder="e.g. Make a presentation about what would happen if Earth got engulfed in an ash cloud"
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  onStart();
                }
              }}
              autoFocus
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                CREAPr will: interpret → research → organize → develop → assemble → open in editor
              </p>
              <Button
                onClick={onStart}
                disabled={!prompt.trim() || running}
                className="gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Start Auto-Build
              </Button>
            </div>
          </div>
        )}

        {/* ── Confirmation State ── */}
        {needsConfirmation && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">CREAPr needs a bit more clarity:</p>
                <p className="text-sm text-muted-foreground mt-1">{clarificationQuestion}</p>
              </div>
            </div>

            {inferredParams && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Title:</span> {inferredParams.title}</div>
                  <div><span className="text-muted-foreground">Audience:</span> {inferredParams.target_audience}</div>
                  <div><span className="text-muted-foreground">Tone:</span> {inferredParams.tone}</div>
                  <div><span className="text-muted-foreground">Depth:</span> {inferredParams.research_depth}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose} disabled={running}>
                Rephrase
              </Button>
              <Button onClick={onConfirmProceed} disabled={running} className="gap-1.5">
                Proceed Anyway <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Pipeline Progress ── */}
        {Object.keys(stageStatuses).length > 0 && !needsConfirmation && (
          <div className="space-y-3 py-2">
            {/* Current detail message */}
            {detail && (
              <div className="text-xs text-muted-foreground px-1 mb-2 truncate">
                {detail}
              </div>
            )}

            {/* Stage list */}
            <div className="space-y-1.5">
              {stages.map((stage, idx) => {
                const status = stageStatuses[stage.id] || 'pending';
                const isCurrent = status === 'running';
                const isDone = status === 'done';
                const isError = status === 'error';

                return (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                      isCurrent ? 'border-berna-purple/40 bg-berna-purple/5' :
                      isError ? 'border-destructive/40 bg-destructive/5' :
                      isDone ? 'border-border bg-transparent opacity-70' :
                      'border-border bg-transparent opacity-40'
                    }`}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-berna-purple animate-spin" />
                      ) : isError ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Stage info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isCurrent ? 'text-berna-purple' : isDone ? 'text-foreground' : isError ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {stage.label}
                        </span>
                        {idx < stages.length - 1 && !isDone && !isCurrent && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
                        )}
                      </div>
                      {(isCurrent || isError) && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {stage.description}
                        </p>
                      )}
                    </div>

                    {/* Step number */}
                    <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0">
                      {idx + 1}/{stages.length}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Error + Retry */}
            {error && failedStage && (
              <div className="space-y-3 mt-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-destructive">
                      {failedStage.charAt(0).toUpperCase() + failedStage.slice(1)} Department failed
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{error}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={onClose} disabled={running}>
                    Cancel
                  </Button>
                  <Button onClick={onRetry} disabled={running} className="gap-1.5">
                    <RotateCcw className="w-4 h-4" />
                    Retry from {failedStage.charAt(0).toUpperCase() + failedStage.slice(1)}
                  </Button>
                </div>
              </div>
            )}

            {/* Running state — no buttons */}
            {running && !error && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                {stageStatuses['editor'] === 'running' ? '✨ Opening Presentation Editor...' : 'CREAPr is working... please wait'}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}