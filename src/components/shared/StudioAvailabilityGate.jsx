import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStudioByKey } from '@/lib/productionProfiles';

export default function StudioAvailabilityGate({ studioKey }) {
  const studio = getStudioByKey(studioKey);

  if (studio?.available) return <Outlet />;

  const Icon = studio?.icon || Construction;
  const label = studio?.label || 'Production Studio';

  return (
    <div className="min-h-screen bg-[#07090d] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.035] p-8 md:p-12 text-center shadow-2xl">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl border border-amber-400/25 bg-amber-400/10">
          <Icon className="h-9 w-9 text-amber-300" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
          <Construction className="h-3.5 w-3.5" />
          Under Construction
        </div>
        <h1 className="mt-5 font-heading text-3xl md:text-5xl font-bold">{label}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm md:text-base leading-relaxed text-white/60">
          This CREAPD studio is being rebuilt for the new production system and is temporarily unavailable.
          Music, Talk, Research, and News are open in this release.
        </p>
        <Button asChild className="mt-8">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to CREAPD
          </Link>
        </Button>
      </div>
    </div>
  );
}
