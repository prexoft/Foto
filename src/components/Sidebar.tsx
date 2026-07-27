import React from 'react';
import { 
  Wand2, 
  X, 
  FolderOpen, 
  Dices, 
  Loader2,
  HelpCircle,
  Mail,
  Handshake,
  Factory,
  AtSign,
  UnfoldHorizontal,
  UnfoldVertical,
  Loader,
  ArrowUpRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface StyleChip {
  name: string;
  style: string;
}

export const STYLE_CHIPS: StyleChip[] = [
  { name: 'Cinematic', style: 'cinematic lighting, film grain, 4K' },
  { name: 'Photorealistic', style: 'photorealistic, hyperdetailed, sharp focus' },
  { name: 'Painterly', style: 'oil painting, impressionist, artistic' },
  { name: 'Anime', style: 'anime style, vibrant colors, sharp lines' },
  { name: 'Dark Moody', style: 'dark moody, dramatic shadows, noir' },
  { name: 'Dreamy', style: 'soft pastel, dreamy, ethereal glow' },
  { name: 'Surreal', style: 'surreal, abstract, digital art' },
  { name: 'Portrait', style: 'portrait photography, bokeh, 85mm lens' }
];

interface SidebarProps {
  pythonStatus: string;
  licenseTier: 'individual' | 'business' | 'business_licensed';
  setIntroStep: React.Dispatch<React.SetStateAction<number>>;
  setShowIntro: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLicenseManager: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEmailPopup: React.Dispatch<React.SetStateAction<boolean>>;
  prompt: string;
  setPrompt: (val: string) => void;
  activeStyles: Set<string>;
  toggleStyleChip: (chip: StyleChip) => void;
  negativePrompt: string;
  setNegativePrompt: (val: string) => void;
  width: number;
  setWidth: (val: number) => void;
  height: number;
  setHeight: (val: number) => void;
  steps: number;
  setSteps: (val: number) => void;
  cfg: number;
  setCfg: (val: number) => void;
  sampler: string;
  setSampler: (val: string) => void;
  seed: number;
  setSeed: (val: number) => void;
  handleRandomizeSeed: () => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  handleCancel: () => void;
  progressPercent: number;
  progressText: string;
  handleOpenFolder: () => void;
}

export function Sidebar({
  pythonStatus,
  licenseTier,
  setIntroStep,
  setShowIntro,
  setShowLicenseManager,
  setShowEmailPopup,
  prompt,
  setPrompt,
  activeStyles,
  toggleStyleChip,
  negativePrompt,
  setNegativePrompt,
  width,
  setWidth,
  height,
  setHeight,
  steps,
  setSteps,
  cfg,
  setCfg,
  sampler,
  setSampler,
  seed,
  setSeed,
  handleRandomizeSeed,
  isGenerating,
  handleGenerate,
  handleCancel,
  progressPercent,
  progressText,
  handleOpenFolder,
}: SidebarProps) {
  return (
    <aside className="no-drag w-88 h-full px-2.5 pb-2.5">
      <div className="flex flex-col h-full bg-[#191919] border-l border-neutral-800 border-t rounded-lg shadow-xl"> 
        {/* Header */}
        <div className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm truncate">
              <span className="font-display font-bold">Foto</span>
              <span className="text-xs text-neutral-400 font-normal">— Photo Generator</span>
            </div>
          </div>
          {/* License badge */}
          <div className="flex flex-col gap-2 rounded-md px-3 py-2.5 bg-neutral-800 shadow-sm -mx-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-300 flex items-center gap-1.5">
                {licenseTier === 'business_licensed' ? (
                  <>
                    <Handshake className='size-3 text-neutral-400'/>
                    <span className="font-medium text-emerald-400">Business tier</span>
                  </>
                ) : (
                  <>
                    <Factory className='size-3 text-neutral-400'/>
                    <span>Personal tier</span>
                  </>
                )}
              </span>
              <Button 
                onClick={() => setShowLicenseManager(true)}
                variant="link" 
                className="text-[11px] text-blue-500 hover:text-blue-400 p-0 h-auto font-medium hover:no-underline"
              >
                {licenseTier === 'business_licensed' ? 'Manage' : 'Get a license'}
              </Button>
            </div>
            <div className="h-[1px] bg-neutral-700 w-full" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-300 flex items-center gap-2">
                <AtSign className="size-3 text-neutral-400" />
                <span>Newsletter</span>
              </span>
              <Button 
                onClick={() => setShowEmailPopup(true)}
                variant="link" 
                className="text-[11px] text-blue-500 hover:text-blue-400 p-0 h-auto font-medium hover:no-underline"
              >
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Configuration Scroll Panel using shadcn ScrollArea */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-2 space-y-4">
            
            {/* Prompt input */}
            <div className="space-y-2">
              <p className='text-xs text-neutral-400'>Prompt</p>
              <Textarea
                  placeholder="Describe image… e.g. cinematic portrait of a woman in golden hour light"
                  rows={4}
                  className='-mx-1'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

              {/* Style Chips with shadcn Button */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {STYLE_CHIPS.map(chip => {
                  const isActive = activeStyles.has(chip.name);
                  return (
                    <Button
                      key={chip.name}
                      onClick={() => toggleStyleChip(chip)}
                      variant={isActive ? "default" : "outline"}
                      className={`text-[10px] h-6 px-2 rounded-sm transition ${
                        isActive 
                          ? 'bg-blue-900 text-blue-100 font-medium'
                          : 'bg-transparent border-neutral-700 border-dashed text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      {chip.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Dimensions with shadcn Select */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <div className="space-y-1.5">
              <UnfoldHorizontal className='size-3.5 text-neutral-400 ml-1'/>
                <Select value={String(width)} onValueChange={(val) => setWidth(parseInt(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Width" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="512">512 px</SelectItem>
                    <SelectItem value="768">768 px</SelectItem>
                    <SelectItem value="1024">1024 px</SelectItem>
                    <SelectItem value="1280">1280 px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
              <UnfoldVertical className='size-3.5 text-neutral-400 ml-1'/>
                <Select value={String(height)} onValueChange={(val) => setHeight(parseInt(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Height" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="512">512 px</SelectItem>
                    <SelectItem value="768">768 px</SelectItem>
                    <SelectItem value="1024">1024 px</SelectItem>
                    <SelectItem value="1280">1280 px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sampler & Seed Row with shadcn Select */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 ml-1">
                  <p className='text-xs text-neutral-400'>Sampler</p>
                  <div className="relative group inline-block">
                    <HelpCircle className="size-3 text-neutral-500 hover:text-neutral-300 cursor-help transition-colors" />
                    <div className="absolute bottom-full left-0 mb-1.5 w-64 p-3 bg-neutral-800 text-neutral-300 text-[11px] rounded shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 leading-normal font-normal">
                      <p className="font-semibold text-neutral-200 mb-1.5">Sampling Algorithms:</p>
                      <ul className="space-y-1 text-[10px] list-none p-0 m-0">
                        <li>• <strong className="text-white">DPM++ 2M:</strong> Sharp, realistic details.</li>
                        <li>• <strong className="text-white">Euler A:</strong> Fast, artistic & dreamy.</li>
                        <li>• <strong className="text-white">Euler:</strong> Consistent, standard style.</li>
                        <li>• <strong className="text-white">DPM2:</strong> Higher quality, slower.</li>
                        <li>• <strong className="text-white">DDIM:</strong> Fast classic, good for variants.</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <Select value={sampler} onValueChange={(val) => setSampler(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sampler" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dpm++2m">DPM++ 2M</SelectItem>
                    <SelectItem value="euler_a">Euler A</SelectItem>
                    <SelectItem value="euler">Euler</SelectItem>
                    <SelectItem value="dpm2">DPM2</SelectItem>
                    <SelectItem value="ddim_trailing">DDIM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 ml-1">
                  <p className='text-xs text-neutral-400'>Seed</p>
                  <div className="relative group inline-block">
                    <HelpCircle className="size-3 text-neutral-500 hover:text-neutral-300 cursor-help transition-colors" />
                    <div className="absolute bottom-full right-0 mb-1.5 w-48 p-2.5 bg-neutral-800 text-neutral-300 text-[11px] rounded shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 leading-normal font-normal">
                      A starting number for generation. The same seed with the same settings recreates the exact same image. Use <strong>-1</strong> for a random image.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="-1"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                  />
                  <Button
                    className='size-8'
                    onClick={handleRandomizeSeed}
                    title="Random seed"
                    variant="secondary"
                  >
                    <Dices />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3">
              <div className="flex justify-between items-center text-xs pb-1.5">
              <p className='text-neutral-400'>Steps (More iterations = Better quality)</p>
                <span className="text-blue-500 font-medium">{steps}</span>
              </div>
              <Slider
                min={5}
                max={50}
                step={1}
                value={[steps]}
                onValueChange={(val) => setSteps(val[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs pb-1.5">
              <p className='text-neutral-400'>CFG Scale (Less scale = More creative)</p>
                <span className="text-blue-500 font-medium">{cfg.toFixed(1)}</span>
              </div>
              <Slider
                min={1}
                max={15}
                step={0.5}
                value={[cfg]}
                onValueChange={(val) => setCfg(val[0])}
              />
            </div>

          </div>
        </ScrollArea>

        {/* Generator Button / Progress Section */}
        <div className="p-6 space-y-4">
          
          {/* Generate & Cancel Action Row using shadcn Button */}
          <div className="flex flex-col gap-2">
            <Button
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader className="animate-spin" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <span>Generate</span>
                </>
              )}
            </Button>
            
            {isGenerating && (
              <Button
                onClick={handleCancel}
                variant="destructive"
              >
                Cancel generation
              </Button>
            )}

            <Button onClick={handleOpenFolder} variant="secondary">
              Go to output directory
              <ArrowUpRight />
            </Button>
          </div>

          {/* Progress Bar & Log updates */}
          {isGenerating && (
            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-neutral-800 shadow-md rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-neutral-500 font-medium">
                <span className="truncate max-w-[240px]">
                  {progressPercent < 10 ? 'Loading model…' : 
                   progressPercent < 95 ? `Step ${Math.round(((progressPercent - 10) / 85) * steps)}/${steps}` : 
                   progressPercent < 100 ? 'Saving image…' : 'Done!'}
                </span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </aside>
  );
}
