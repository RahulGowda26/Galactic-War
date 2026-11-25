import React from 'react';
import { SkipForward } from 'lucide-react';
import type { CinematicFrameState } from '../scene/cinematicDirector';

interface CinematicOverlayProps {
  cinematic: CinematicFrameState;
  onSkip: () => void;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  cinematic,
  onSkip,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between pointer-events-none select-none">
      {/* Top Letterbox Bar */}
      <div className="h-14 md:h-16 bg-[#05080f] border-b border-slate-800/70 flex items-center justify-between px-6 md:px-8">
        <span className="text-[11px] font-mono-tabular uppercase tracking-[0.26em] text-amber-300">
          {cinematic.actTitle || 'ACT I · ORBITAL SIEGE'}
        </span>
        <button
          type="button"
          onClick={onSkip}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 border border-slate-700/70 text-[10.5px] font-mono-tabular uppercase tracking-[0.16em] text-slate-300 hover:text-white hover:border-slate-400 transition-colors cursor-pointer"
        >
          Skip Intro
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Letterbox Bar + Narrative Caption + Progress */}
      <div className="bg-[#05080f] border-t border-slate-800/70 px-6 md:px-8 pt-4 pb-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs md:text-sm font-normal tracking-[0.03em] text-slate-200 leading-relaxed">
            {cinematic.caption}
          </p>
          <div className="mt-4 h-[2px] w-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-sky-300 transition-all duration-150"
              style={{ width: `${Math.round(cinematic.progress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
