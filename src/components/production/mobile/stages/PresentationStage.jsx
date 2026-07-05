import React from 'react';
import { Clapperboard, Loader2, Film, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function PresentationStage({ pkg, handleGeneratePresentation, generatingPresentation }) {
  return (
    <div className="space-y-3">
      <div className="glass-panel p-4 text-center">
        <Clapperboard className="w-10 h-10 text-berna-purple mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white mb-1">AI Presentation Director</h3>
        <p className="text-xs text-muted-foreground">
          Presentations are generated from the Production page using all approved packages (minimum 5 required).
        </p>
      </div>

      <Button className="w-full bg-berna-purple/80 hover:bg-berna-purple text-white h-9" onClick={handleGeneratePresentation} disabled={generatingPresentation || !pkg}>
        {generatingPresentation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
        {generatingPresentation ? 'Generating...' : 'Generate Presentation'}
      </Button>

      <Link to="/news/productionpackages" className="block">
        <div className="glass-panel p-3 flex items-center justify-between hover:border-white/[0.12] transition-colors">
          <span className="text-xs text-muted-foreground">Go to Production page</span>
          <ArrowRight className="w-3.5 h-3.5 text-berna-purple" />
        </div>
      </Link>

      <div className="glass-panel p-3">
        <span className="text-[10px] text-muted-foreground">Status: Not Started — generate from Production page once package is approved.</span>
      </div>
    </div>
  );
}