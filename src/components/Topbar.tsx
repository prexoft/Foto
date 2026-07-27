import React from 'react';
import { 
  PanelLeft, 
  PanelBottom, 
  PanelRight, 
  HelpCircle, 
  Settings, 
  Bolt
} from 'lucide-react';
import { Button } from "@/components/ui/button";

interface TopbarProps {
  showLeftHistory: boolean;
  setShowLeftHistory: React.Dispatch<React.SetStateAction<boolean>>;
  showBottomGallery: boolean;
  setShowBottomGallery: React.Dispatch<React.SetStateAction<boolean>>;
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  setIntroStep: React.Dispatch<React.SetStateAction<number>>;
  setShowIntro: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLicenseManager: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettings: (show: boolean) => void;
}

export function Topbar({
  showLeftHistory,
  setShowLeftHistory,
  showBottomGallery,
  setShowBottomGallery,
  showSidebar,
  setShowSidebar,
  setIntroStep,
  setShowIntro,
  setShowLicenseManager,
  setShowSettings,
}: TopbarProps) {
  return (
    <header className="titlebar flex items-center justify-between px-3 text-neutral-400 select-none">
      {/* Left: App Title */}
      <div className="flex items-center gap-1.5 text-xs font-medium pl-[70px]">
        <span className="font-semibold text-neutral-200">Foto</span>
        <span className="text-neutral-400 font-normal">— Photo Generator</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-0.5 no-drag">

        {/* Help Button & App Info Tooltip */}
        <div className="relative pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIntroStep(0);
              setShowIntro(true);
            }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          className='pointer-events-auto'
        >
          <Bolt className="w-3.5 h-3.5" />
        </Button>
      </div>
    </header>
  );
}
