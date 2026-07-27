import React, { useState, useEffect } from 'react';
import { ArrowRight,CheckCircle2, ArrowUpRight, ArrowDownCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  licenseTier: 'individual' | 'business' | 'business_licensed';
  setShowLicenseManager: (show: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ModelOption {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  dummyUrl?: string;
  urls?: { filename: string; url: string }[];
  requiresBusiness: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  licenseTier,
  setShowLicenseManager,
  selectedModel,
  setSelectedModel,
  showToast,
}) => {
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});
  const [downloadedModels, setDownloadedModels] = useState<any>({
    general: false,
    heavy: false,
    ultra: false,
    encoders: { installed: false, count: 0, percent: 0 },
  });

  const [systemSpecs, setSystemSpecs] = useState<{
    cpuModel: string;
    ramGB: number;
    isMSeries: boolean;
    isIntelI5OrHigher: boolean;
    isProMaxUltra: boolean;
  } | null>(null);

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [pendingModel, setPendingModel] = useState<ModelOption | null>(null);

  const models: ModelOption[] = [
    {
      id: 'encoders',
      name: 'Packages',
      badge: 'Required Package',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      description: 'CLIP text encoders and SDXL VAE files.',
      urls: [
        { filename: 'text-encoder.fp16.safetensors', url: 'https://huggingface.co/RunDiffusion/Juggernaut-XL-v9/resolve/main/text_encoder/model.fp16.safetensors?download=true' },
        { filename: 'text-encoder2.fp16.safetensors', url: 'https://huggingface.co/RunDiffusion/Juggernaut-XL-v9/resolve/main/text_encoder_2/model.fp16.safetensors?download=true' },
        { filename: 'vae-fp16.safetensors', url: 'https://huggingface.co/RunDiffusion/Juggernaut-XL-v9/resolve/main/vae/diffusion_pytorch_model.fp16.safetensors?download=true' }
      ],
      requiresBusiness: false,
    },
    {
      id: 'general',
      name: 'General use',
      badge: 'Free',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      description: 'Standard speed and quality. Perfect for quick drafts, everyday designs, and basic photo generation.',
      dummyUrl: 'https://huggingface.co/offgrid-ai/juggernaut-xl-v9-GGUF/resolve/main/juggernaut-xl-v9-Q4_K.gguf?download=true',
      requiresBusiness: false,
    },
    {
      id: 'heavy',
      name: 'Heavy',
      badge: 'Free',
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      description: 'Enhanced details, better textures, and improved prompt adherence. Ideal for complex realistic styles.',
      dummyUrl: 'https://huggingface.co/offgrid-ai/juggernaut-xl-v9-GGUF/resolve/main/juggernaut-xl-v9-Q8_0.gguf?download=true',
      requiresBusiness: false,
    },
  ];

  const hasBusinessAccess = licenseTier === 'business_licensed' || licenseTier === 'business';

  const checkModelsStatus = async () => {
    try {
      const status = await window.foto.checkModelsStatus();
      setDownloadedModels(status);

      // Auto-activation logic (exclude encoders from selection):
      const downloadedIds = Object.keys(status).filter((key) => key !== 'encoders' && status[key]);

      if (downloadedIds.length === 1) {
        // If exactly one model is downloaded, automatically activate it
        const onlyModel = downloadedIds[0];
        if (selectedModel !== onlyModel) {
          setSelectedModel(onlyModel);
          localStorage.setItem('foto_selected_model', onlyModel);
          showToast(`✦ Auto-activated ${onlyModel.toUpperCase()} as it is the only model downloaded.`, 'info');
        }
      } else if (downloadedIds.length > 1) {
        // If multiple are downloaded, but current selection is NOT among the downloaded ones
        if (!status[selectedModel]) {
          const fallback = downloadedIds[0];
          setSelectedModel(fallback);
          localStorage.setItem('foto_selected_model', fallback);
          showToast(`✦ Active model switched to ${fallback.toUpperCase()}`, 'info');
        }
      } else {
        // No models downloaded: clear selection (or reset to default 'general')
        if (selectedModel !== 'general') {
          setSelectedModel('general');
          localStorage.setItem('foto_selected_model', 'general');
        }
      }
    } catch (err) {
      console.error('Failed to check models status:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkModelsStatus();

      const fetchSpecs = async () => {
        try {
          const specs = await window.foto.getSystemSpecs();
          setSystemSpecs(specs);

          const isGenDisabled = specs.ramGB < 7 || (!specs.isMSeries && !specs.isIntelI5OrHigher);
          const isHvyDisabled = specs.ramGB < 15 || !specs.isMSeries;

          if (selectedModel === 'heavy' && isHvyDisabled) {
            if (!isGenDisabled) {
              setSelectedModel('general');
              localStorage.setItem('foto_selected_model', 'general');
              showToast('Heavy model is disabled on your device specs. Switched to General use.', 'info');
            } else {
              setSelectedModel('');
              localStorage.setItem('foto_selected_model', '');
              showToast('Your system does not meet requirements for Heavy or General use models.', 'error');
            }
          } else if (selectedModel === 'general' && isGenDisabled) {
            setSelectedModel('');
            localStorage.setItem('foto_selected_model', '');
            showToast('Your system does not meet requirements for General use model.', 'error');
          }
        } catch (err) {
          console.error('Failed to get system specs:', err);
        }
      };
      fetchSpecs();

      // Listen for download progress updates
      window.foto.onDownloadProgress((data) => {
        if (data.status === 'downloading') {
          setDownloadProgress((prev) => ({ ...prev, [data.modelId]: data.progress ?? 0 }));
          setIsDownloading((prev) => ({ ...prev, [data.modelId]: true }));
        } else if (data.status === 'completed') {
          setDownloadProgress((prev) => ({ ...prev, [data.modelId]: 100 }));
          setIsDownloading((prev) => ({ ...prev, [data.modelId]: false }));
          checkModelsStatus();
          showToast(`Model downloaded successfully!`, 'success');
        } else if (data.status === 'error') {
          setIsDownloading((prev) => ({ ...prev, [data.modelId]: false }));
          showToast(`Download failed: ${data.error}`, 'error');
        }
      });
    }

    return () => {
      window.foto.removeDownloadProgressListener();
    };
  }, [isOpen, selectedModel]);

  const startActualDownload = async (model: ModelOption) => {
    try {
      setIsDownloading((prev) => ({ ...prev, [model.id]: true }));
      setDownloadProgress((prev) => ({ ...prev, [model.id]: 0 }));
      const downloadParam = model.id === 'encoders' ? model.urls : model.dummyUrl;
      const res = await window.foto.downloadModel(model.id, downloadParam);
      if (!res.success) {
        showToast(`Download failed: ${res.error}`, 'error');
      }
    } catch (err: any) {
      setIsDownloading((prev) => ({ ...prev, [model.id]: false }));
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDownload = async (model: ModelOption) => {
    if (model.id === 'encoders') {
      startActualDownload(model);
      return;
    }

    if (model.requiresBusiness && !hasBusinessAccess) {
      showToast('Business license required to download the Ultra model.', 'error');
      return;
    }

    if (systemSpecs !== null) {
      if (model.id === 'general') {
        const isGenDisabled = systemSpecs.ramGB < 7 || (!systemSpecs.isMSeries && !systemSpecs.isIntelI5OrHigher);
        if (isGenDisabled) {
          showToast('General use model is disabled on your device specs.', 'error');
          return;
        }
      }
      if (model.id === 'heavy') {
        const isHvyDisabled = systemSpecs.ramGB < 15 || !systemSpecs.isMSeries;
        if (isHvyDisabled) {
          showToast('Heavy model is disabled on your device specs.', 'error');
          return;
        }
      }
    }

    // Check if other models exist
    const otherModelsDownloaded = Object.keys(downloadedModels).some(
      (id) => id !== 'encoders' && id !== model.id && downloadedModels[id]
    );

    if (otherModelsDownloaded) {
      setPendingModel(model);
      setShowConfirmDelete(true);
    } else {
      startActualDownload(model);
    }
  };

  const executeDeleteModel = async (modelId: string) => {
    try {
      const res = await window.foto.deleteModel(modelId);
      if (res.success) {
        showToast(`Deleted ${modelId.toUpperCase()} model to free space.`, 'info');
      } else {
        showToast(`Failed to delete model: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleActivate = (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (model?.requiresBusiness && !hasBusinessAccess) {
      showToast('Business license required to use the Ultra model.', 'error');
      return;
    }
    if (systemSpecs !== null) {
      if (modelId === 'general') {
        const isGenDisabled = systemSpecs.ramGB < 7 || (!systemSpecs.isMSeries && !systemSpecs.isIntelI5OrHigher);
        if (isGenDisabled) {
          showToast('General use model is disabled on your device specs.', 'error');
          return;
        }
      }
      if (modelId === 'heavy') {
        const isHvyDisabled = systemSpecs.ramGB < 15 || !systemSpecs.isMSeries;
        if (isHvyDisabled) {
          showToast('Heavy model is disabled on your device specs.', 'error');
          return;
        }
      }
    }
    setSelectedModel(modelId);
    showToast(`Switched active model to ${modelId.toUpperCase()}`, 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#191919] overflow-y-auto">
      <div className="relative w-full max-w-3xl p-6 sm:p-8 rounded-lg">

        {/* Keep or Delete Confirmation Overlay */}
        {showConfirmDelete && pendingModel && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#191919]/70 transition-all duration-300">
            <div className="max-w-md w-full bg-neutral-800 rounded-xl p-6 shadow-2xl text-center">
              <img src='https://img.icons8.com/3d-fluency/256/stop-hand.png' className='size-24 mx-auto' />
              <h3 className="text-md font-semibold text-neutral-100 mb-1 mt-3">Delete other models?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-6 max-w-sm">
                You already have other models downloaded. Would you like to delete them to save disk space, or keep them?
              </p>
              <div className="flex flex-col gap-2 max-w-[300px] mx-auto">
                <Button
                  onClick={() => {
                    setShowConfirmDelete(false);
                    startActualDownload(pendingModel);
                  }}
                >
                  Keep other model(s) and download
                </Button>
                <Button
                  onClick={async () => {
                    const otherModelIds = Object.keys(downloadedModels).filter(
                      (id) => id !== 'encoders' && id !== pendingModel.id && downloadedModels[id]
                    );
                    for (const id of otherModelIds) {
                      await executeDeleteModel(id);
                    }
                    setShowConfirmDelete(false);
                    startActualDownload(pendingModel);
                  }}
                  variant='destructive'
                >
                  Delete other model(s) and download
                </Button>
                <Button
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setPendingModel(null);
                  }}
                  variant="secondary"
                >
                  Do nothing, Just close it
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 text-center items-center">
          <img src='https://img.icons8.com/3d-fluency/256/cloud-development.png' className='size-32 my-4' />
          <h1 className="text-lg text-neutral-100 font-semibold">
            Model selection
          </h1>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            Download and activate models optimized for different use cases. All models generate fully offline.
          </p>
        </div>

        <div className="space-y-6 max-h-[50vh] max-w-2xl mx-auto overflow-y-auto pr-1 my-8">
          {/* Required Packages Section */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              {models.filter(m => m.id === 'encoders').map((model) => {
                const isDownloaded = downloadedModels.encoders?.installed;
                const downloading = isDownloading[model.id];
                const progress = downloadProgress[model.id] || 0;
                const isDisabled = false;
                const anyDownloading = Object.values(isDownloading).some(Boolean);
                const fileCount = downloadedModels.encoders?.count || 0;
                const hasPartialEncoders = fileCount > 0 && fileCount < 3;

                return (
                  <div
                    key={model.id}
                    className={`group relative bg-neutral-800 rounded-lg shadow-md px-5 py-4 transition-all duration-300 ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-2">
                        <h4 className="font-semibold text-sm text-neutral-200">{model.name}</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed max-w-[90%]">
                          {model.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {downloading ? (
                          <div className="w-[110px] flex flex-col items-end gap-1.5">
                            <div className="w-full bg-neutral-700 shadow-sm h-1.5 rounded-full overflow-hidden">
                              <div
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              Installing {progress}%
                            </span>
                          </div>
                        ) : isDownloaded ? (
                          <div className="flex items-center gap-2">
                            <div className="text-neutral-500 text-xs font-medium flex items-center gap-1.5 cursor-default">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Installed</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            {hasPartialEncoders && (
                              <span className="text-xs font-medium text-indigo-400">
                                {downloadedModels.encoders?.percent}% completed ({fileCount}/3 files)
                              </span>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleDownload(model)}
                              disabled={anyDownloading}
                            >
                              <ArrowDownCircle />
                              <span>Install</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generation Models Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-xs font-medium text-neutral-400">
                Choose one of the compatible models for generations
              </h3>
            </div>
            <div className="space-y-2.5">
              {models.filter(m => m.id !== 'encoders').map((model) => {
                const isDownloaded = downloadedModels[model.id];
                const downloading = isDownloading[model.id];
                const progress = downloadProgress[model.id] || 0;
                const isActive = selectedModel === model.id;

                const isGenDisabled = model.id === 'general' && systemSpecs !== null && (
                  systemSpecs.ramGB < 7 || (!systemSpecs.isMSeries && !systemSpecs.isIntelI5OrHigher)
                );
                const isHeavyDisabled = model.id === 'heavy' && systemSpecs !== null && (
                  systemSpecs.ramGB < 15 || !systemSpecs.isMSeries
                );
                const isDisabled = isGenDisabled || isHeavyDisabled;

                const anyDownloading = Object.values(isDownloading).some(Boolean);

                return (
                  <div
                    key={model.id}
                    className={`group relative bg-neutral-800 rounded-lg shadow-md px-5 py-4 transition-all duration-300 ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm text-neutral-200">{model.name}</h4>
                          {model.name === 'Heavy' && (
                            <span className='font-medium text-xs text-red-400'>
                              {isHeavyDisabled
                                ? 'Not supported on your device'
                                : (systemSpecs !== null && systemSpecs.isProMaxUltra
                                  ? null
                                  : 'Not recommended for low specs device')}
                            </span>
                          )}
                          {model.name === 'General use' && isGenDisabled && (
                            <span className='font-medium text-xs text-red-400'>
                              Not supported on your device
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed max-w-[90%]">
                          {model.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDisabled ? (
                          <Button
                            size="sm"
                            disabled
                            variant="secondary"
                            className="cursor-not-allowed opacity-50"
                          >
                            Not supported
                          </Button>
                        ) : downloading ? (
                          <div className="w-[110px] flex flex-col items-end gap-1.5">
                            <div className="w-full bg-neutral-700 shadow-sm h-1.5 rounded-full overflow-hidden">
                              <div
                                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              Downloading {progress}%
                            </span>
                          </div>
                        ) : isDownloaded ? (
                          isActive ? (
                            <div className="flex items-center gap-2">
                              <div className="text-neutral-500 text-xs font-medium flex items-center gap-1.5 cursor-default">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Default</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleActivate(model.id)}
                              >
                                Use this model
                              </Button>
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleDownload(model)}
                              disabled={anyDownloading}
                            >
                              <ArrowDownCircle />
                              <span>I'll use this</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-col items-center w-full max-w-2xl mx-auto mb-4">
          <Button
            className='w-fit'
            size='sm'
            disabled={!selectedModel || !downloadedModels[selectedModel]}
            onClick={onClose}
          >
            Start Generating right now <ArrowRight />
          </Button>
          <Button
            className='w-fit'
            variant='secondary'
            size='sm'
            disabled={!selectedModel || !downloadedModels[selectedModel]}
            onClick={onClose}
          >
            Contact support team <ArrowUpRight />
          </Button>
        </div>
      </div>
    </div>
  );
};
