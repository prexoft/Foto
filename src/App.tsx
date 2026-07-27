import React, { useState, useEffect } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import { IntroOverlay } from './components/IntroOverlay';
import { LicenseManager } from './components/LicenseManager';
import { EmailSubscribePopup } from './components/EmailSubscribePopup';
import { Topbar } from './components/Topbar';
import { Sidebar, StyleChip } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { Settings } from './components/Settings';

// Declare types for window.foto contextBridge API
declare global {
  interface Window {
    foto: {
      generateImage: (params: {
        prompt: string;
        negativePrompt: string;
        steps: number;
        cfg: number;
        width: number;
        height: number;
        seed: number;
        sampler: string;
        model: string;
      }) => Promise<{
        success: boolean;
        base64?: string;
        filePath?: string;
        cancelled?: boolean;
        timestamp?: number;
      }>;
      cancelGeneration: () => Promise<{ cancelled: boolean }>;
      openOutputFolder: () => Promise<void>;
      deleteImage: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      getGeneratedImages: () => Promise<Array<{ filePath: string; timestamp: number }>>;
      checkPythonReady: () => Promise<{ ready: boolean; timedOut?: boolean; output?: string }>;
      checkModelsStatus: () => Promise<{ general: boolean; heavy: boolean; ultra: boolean }>;
      downloadModel: (modelId: string, url: any) => Promise<{ success: boolean; error?: string }>;
      deleteModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
      onProgress: (callback: (data: { type: 'progress' | 'log'; percent?: number; message?: string }) => void) => void;
      removeProgressListener: () => void;
      onDownloadProgress: (callback: (data: { modelId: string; progress?: number; status: 'downloading' | 'completed' | 'error'; error?: string }) => void) => void;
      removeDownloadProgressListener: () => void;
      getSystemSpecs: () => Promise<{
        cpuModel: string;
        ramGB: number;
        isMSeries: boolean;
        isIntelI5OrHigher: boolean;
        isProMaxUltra: boolean;
      }>;
    };
  }
}

interface ImageRecord {
  filePath: string;
  timestamp: number;
}

export default function App() {
  // --- Safe API wrapper ---
  const api = () => {
    const f = window.foto;
    if (!f) throw new Error('Foto API not available — preload.js may not have loaded');
    return f;
  };

  // --- States ---
  const [pythonStatus, setPythonStatus] = useState<string>('Checking…');
  const [pythonReady, setPythonReady] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // --- Generation Parameters ---
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>(
    'blurry, low quality, ugly, deformed, watermark, text, extra limbs'
  );
  const [width, setWidth] = useState<number>(1024);
  const [height, setHeight] = useState<number>(1024);
  const [steps, setSteps] = useState<number>(20);
  const [cfg, setCfg] = useState<number>(7.0);
  const [sampler, setSampler] = useState<string>('dpm++2m');
  const [seed, setSeed] = useState<number>(-1);
  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());

  // Temp preview for the base64 of generated image
  const [latestPreviewBase64, setLatestPreviewBase64] = useState<string | null>(null);

  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return localStorage.getItem('foto_intro_completed') !== 'true';
  });
  const [introStep, setIntroStep] = useState<number>(0);
  const [licenseTier, setLicenseTier] = useState<'individual' | 'business' | 'business_licensed'>(() => {
    return (localStorage.getItem('foto_license_tier') as any) || 'individual';
  });
  const [showLicenseManager, setShowLicenseManager] = useState<boolean>(false);
  const [showEmailPopup, setShowEmailPopup] = useState<boolean>(false);
  const [showLeftHistory, setShowLeftHistory] = useState<boolean>(false);
  const [showBottomGallery, setShowBottomGallery] = useState<boolean>(true);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('foto_selected_model') || 'general';
  });

  // Trigger newsletter popup post intro completion
  useEffect(() => {
    const introCompleted = localStorage.getItem('foto_intro_completed') === 'true';
    const newsletterShown = localStorage.getItem('foto_newsletter_shown') === 'true';
    if (introCompleted && !newsletterShown && !showIntro && !showLicenseManager) {
      const timer = setTimeout(() => {
        setShowEmailPopup(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showIntro, showLicenseManager]);

  // --- Toast helper ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) => {
    if (type === 'success') {
      toast.success(message, { duration });
    } else if (type === 'error') {
      toast.error(message, { duration });
    } else {
      toast(message, { duration });
    }
  };

  // --- Load gallery ---
  const loadGallery = async () => {
    try {
      const imgs = await api().getGeneratedImages();
      setImages(imgs || []);
    } catch (err: any) {
      console.error('Failed to load gallery:', err);
    }
  };

  // --- Check python state ---
  const checkPythonReady = async () => {
    setPythonStatus('Checking…');
    try {
      const timeout = new Promise<any>(resolve =>
        setTimeout(() => resolve({ ready: true, timedOut: true }), 4000)
      );
      const result = await Promise.race([api().checkPythonReady(), timeout]);
      if (result.ready) {
        setPythonReady(true);
        setPythonStatus('Juggernaut XL Ready');
      } else {
        setPythonReady(false);
        setPythonStatus('Install Required');
        showToast('⚠️ Run: venv/bin/pip install stable-diffusion-cpp-python', 'error', 8000);
      }
    } catch (err) {
      // Default to ready to let user try
      setPythonReady(true);
      setPythonStatus('Juggernaut XL Ready');
    }
  };

  const checkInitialModelStatus = async () => {
    try {
      const status = await api().checkModelsStatus();
      const hasAnyModel = Object.values(status).some(downloaded => downloaded);
      if (!hasAnyModel) {
        setShowSettings(true);
        showToast('ℹ️ Please download a model to begin generating photos offline.', 'info', 5000);
      }
    } catch (e) {
      console.error('Failed to check initial model status:', e);
    }
  };

  // --- Initialize ---
  useEffect(() => {
    checkPythonReady();
    loadGallery();
    checkInitialModelStatus();

    // Progress updates via IPC listener
    const handleProgress = (data: { type: 'progress' | 'log'; percent?: number; message?: string }) => {
      if (data.type === 'progress' && data.percent !== undefined) {
        const pct = Math.min(100, Math.max(0, data.percent));
        setProgressPercent(pct);
        if (pct < 10) {
          setProgressText('Loading model…');
        } else if (pct < 95) {
          setProgressText(`Generating… ${pct}%`);
        } else {
          setProgressText('Saving image…');
        }
      } else if (data.type === 'log' && data.message) {
        const msg = data.message.replace(/\[Foto\]\s?/, '');
        if (msg && !msg.startsWith('[')) {
          setProgressText(msg.length > 55 ? msg.substring(0, 55) + '…' : msg);
        }
      }
    };

    api().onProgress(handleProgress);

    return () => {
      api().removeProgressListener();
    };
  }, []);

  // --- Style chip click handler ---
  const toggleStyleChip = (chip: StyleChip) => {
    const newStyles = new Set(activeStyles);
    let updatedPrompt = prompt.trim();

    if (newStyles.has(chip.name)) {
      newStyles.delete(chip.name);
      // Remove style substring from prompt
      const stylePart = `, ${chip.style}`;
      if (updatedPrompt.includes(stylePart)) {
        updatedPrompt = updatedPrompt.replace(stylePart, '');
      } else if (updatedPrompt.includes(chip.style)) {
        updatedPrompt = updatedPrompt.replace(chip.style, '');
      }
    } else {
      newStyles.add(chip.name);
      // Add style substring to prompt
      const separator = updatedPrompt ? ', ' : '';
      updatedPrompt = `${updatedPrompt}${separator}${chip.style}`;
    }

    setActiveStyles(newStyles);
    setPrompt(updatedPrompt.trim());
  };

  // --- Handlers ---
  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    // Check if any model is downloaded
    try {
      const status = await api().checkModelsStatus();
      const hasAnyModel = Object.values(status).some(downloaded => downloaded);
      if (!hasAnyModel) {
        showToast('⚠️ No models downloaded. Please download a model to generate.', 'error');
        setShowSettings(true);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    setIsGenerating(true);
    setProgressPercent(0);
    setProgressText('Starting…');
    setLatestPreviewBase64(null);

    const params = {
      prompt,
      negativePrompt,
      steps,
      cfg,
      width,
      height,
      seed,
      sampler,
      model: selectedModel
    };

    try {
      const result = await api().generateImage(params);
      if (result.success) {
        setProgressPercent(100);
        setProgressText('Done!');
        if (result.base64) {
          setLatestPreviewBase64(result.base64);
        }
        showToast('✦ Image generated!', 'success');
        // Refresh local gallery
        await loadGallery();
        setTimeout(() => {
          setIsGenerating(false);
          setLatestPreviewBase64(null);
        }, 1500);
      } else if (result.cancelled) {
        showToast('Generation cancelled', 'info');
        setIsGenerating(false);
      }
    } catch (err: any) {
      showToast(`${err.message}`, 'error', 6000);
      setIsGenerating(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api().cancelGeneration();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (filePath: string) => {
    try {
      const result = await api().deleteImage(filePath);
      if (result.success) {
        showToast('Image deleted', 'success');
        setLightboxImage(null);
        await loadGallery();
      } else {
        showToast(`Failed to delete: ${result.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  const handleOpenFolder = async () => {
    try {
      await api().openOutputFolder();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleGenerate();
      }
      if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, negativePrompt, steps, cfg, width, height, seed, sampler, isGenerating, selectedModel]);

  return (
    <div className="relative h-screen w-screen overflow-hidden text-neutral-100 flex flex-col font-sans select-none bg-neutral-950">

      <Topbar
        showLeftHistory={showLeftHistory}
        setShowLeftHistory={setShowLeftHistory}
        showBottomGallery={showBottomGallery}
        setShowBottomGallery={setShowBottomGallery}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        setIntroStep={setIntroStep}
        setShowIntro={setShowIntro}
        setShowLicenseManager={setShowLicenseManager}
        setShowSettings={setShowSettings}
      />

      {/* App Layout */}
      <div className="relative z-10 flex flex-1 h-full pt-[38px] overflow-hidden">

        <MainContent
          images={images}
          lightboxImage={lightboxImage}
          setLightboxImage={setLightboxImage}
          latestPreviewBase64={latestPreviewBase64}
          showBottomGallery={showBottomGallery}
          showLeftHistory={showLeftHistory}
          handleOpenFolder={handleOpenFolder}
          handleDelete={handleDelete}
        />

        {showSidebar && (
          <Sidebar
            pythonStatus={pythonStatus}
            licenseTier={licenseTier}
            setIntroStep={setIntroStep}
            setShowIntro={setShowIntro}
            setShowLicenseManager={setShowLicenseManager}
            setShowEmailPopup={setShowEmailPopup}
            prompt={prompt}
            setPrompt={setPrompt}
            activeStyles={activeStyles}
            toggleStyleChip={toggleStyleChip}
            negativePrompt={negativePrompt}
            setNegativePrompt={setNegativePrompt}
            width={width}
            setWidth={setWidth}
            height={height}
            setHeight={setHeight}
            steps={steps}
            setSteps={setSteps}
            cfg={cfg}
            setCfg={setCfg}
            sampler={sampler}
            setSampler={setSampler}
            seed={seed}
            setSeed={setSeed}
            handleRandomizeSeed={handleRandomizeSeed}
            isGenerating={isGenerating}
            handleGenerate={handleGenerate}
            handleCancel={handleCancel}
            progressPercent={progressPercent}
            progressText={progressText}
            handleOpenFolder={handleOpenFolder}
          />
        )}

      </div>

      {/* Lightbox Modal using shadcn Dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => { if (!open) setLightboxImage(null); }}>
        <DialogContent className='max-w-2xl'>
          <DialogTitle className="sr-only">Full size preview</DialogTitle>
          {lightboxImage && (
            <>
              <img
                className="max-w-full object-contain rounded-lg border border-neutral-800/50 shadow-2xl"
                src={`file://${lightboxImage}`}
                alt="Full size preview"
              />

              {/* Lightbox controls */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={handleOpenFolder}
                  variant="secondary"
                >
                  <span>Open directory</span>
                </Button>
                <Button
                  onClick={() => handleDelete(lightboxImage)}
                  variant="destructive"
                >
                  <span>Delete</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Intro Welcome Screen */}
      {showIntro && !showLicenseManager && (
        <IntroOverlay
          currentStep={introStep}
          setCurrentStep={setIntroStep}
          onSelectIndividual={() => {
            localStorage.setItem('foto_intro_completed', 'true');
            localStorage.setItem('foto_license_tier', 'individual');
            setLicenseTier('individual');
            setShowIntro(false);
            showToast('Welcome to Foto!', 'success');
          }}
          onSelectBusiness={() => {
            setShowLicenseManager(true);
          }}
        />
      )}

      {/* License Manager Modal / Upgrade Dialog */}
      <LicenseManager
        isOpen={showLicenseManager}
        onClose={() => {
          setShowLicenseManager(false);
          setIntroStep(2);
        }}
        licenseTier={licenseTier}
        setLicenseTier={setLicenseTier}
        setShowIntro={setShowIntro}
        showToast={showToast}
      />

      {/* Model Library / Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        licenseTier={licenseTier}
        setShowLicenseManager={setShowLicenseManager}
        selectedModel={selectedModel}
        setSelectedModel={(model) => {
          setSelectedModel(model);
          localStorage.setItem('foto_selected_model', model);
        }}
        showToast={showToast}
      />

      {/* Email Subscribe Modal / Newsletter Signup */}
      <EmailSubscribePopup
        isOpen={showEmailPopup}
        onClose={() => setShowEmailPopup(false)}
        showToast={showToast}
      />

      {/* Toast Notifications Container from sonner */}
      <Toaster position="bottom-right" theme="dark" />

    </div>
  );
}
