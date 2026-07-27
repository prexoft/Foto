import React from 'react';
import { 
  Sparkles, 
  Trash2, 
  Download, 
  Search, 
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ImageRecord {
  filePath: string;
  timestamp: number;
}

interface MainContentProps {
  images: ImageRecord[];
  lightboxImage: string | null;
  setLightboxImage: (val: string | null) => void;
  latestPreviewBase64: string | null;
  showBottomGallery: boolean;
  showLeftHistory: boolean;
  handleOpenFolder: () => void;
  handleDelete: (filePath: string) => void;
}

export function MainContent({
  images,
  lightboxImage,
  setLightboxImage,
  latestPreviewBase64,
  showBottomGallery,
  showLeftHistory,
  handleOpenFolder,
  handleDelete,
}: MainContentProps) {
  // Determine latest featured image
  const latestImage = images[0];

  return (
    <>
      {/* Left History Sidebar */}
      {showLeftHistory && (
        <aside className="no-drag w-64 h-full p-2.5 border-r border-neutral-900/60 bg-neutral-950/40 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2 pt-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">History</span>
            <span className="text-[10px] text-neutral-500 font-mono">{images.length} items</span>
          </div>
          
          {images.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-xs text-neutral-500">
              No generated images yet
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-2.5 pr-2">
                {images.map((img) => (
                  <div
                    key={img.filePath}
                    className={`relative group rounded-lg overflow-hidden border cursor-pointer transition ${
                      lightboxImage === img.filePath || (images[0]?.filePath === img.filePath && !lightboxImage)
                        ? 'border-blue-500/80 bg-blue-950/20'
                        : 'border-neutral-800/80 hover:border-neutral-700 bg-neutral-900/10'
                    }`}
                    onClick={() => setLightboxImage(img.filePath)}
                  >
                    <div className="aspect-video w-full relative overflow-hidden bg-black/40">
                      <img
                        src={`file://${img.filePath}`}
                        alt="History thumbnail"
                        className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-[9px] text-neutral-500 font-mono">
                        {new Date(img.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(img.filePath);
                          }}
                          variant="destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </aside>
      )}
      
      {/* Gallery & Showcase area */}
      <main className="no-drag flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Main Empty State */}
        {images.length === 0 && !latestPreviewBase64 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <img src='https://img.icons8.com/3d-fluency/512/bard.png' className='size-32'/>
            <div className="space-y-1.5">
              <h1 className="text-xl font-display font-semibold text-neutral-200">Generate a photo</h1>
              <p className="text-xs text-neutral-500 max-w-sm font-medium leading-relaxed">
                Describe what you want to see. The generator is fully offline, unlimited, and runs locally.
              </p>
            </div>
          </div>
        )}

        {/* Main Content Grid when image(s) exist */}
        {(images.length > 0 || latestPreviewBase64) && (
          <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
            
            {/* Top Row: Latest Generation Showcase */}
            <div className="flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
              <div className="relative group rounded-2xl overflow-hidden border border-neutral-800/80 bg-neutral-950/60 max-w-full max-h-full aspect-square flex items-center justify-center shadow-2xl">
                {latestPreviewBase64 ? (
                  <img 
                    src={`data:image/png;base64,${latestPreviewBase64}`}
                    alt="Latest generation preview" 
                    className="max-w-full max-h-[50vh] object-contain cursor-zoom-in"
                    onClick={() => latestImage && setLightboxImage(latestImage.filePath)}
                  />
                ) : latestImage ? (
                  <img 
                    src={`file://${latestImage.filePath}`} 
                    alt="Latest generation" 
                    className="max-w-full max-h-[50vh] object-contain cursor-zoom-in"
                    onClick={() => setLightboxImage(latestImage.filePath)}
                  />
                ) : null}

                {/* Actions overlay for latest image */}
                {latestImage && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-end gap-2">
                    <Button
                      onClick={handleOpenFolder}
                      variant="secondary"
                    >
                      <span>Download</span>
                    </Button>
                    <Button
                      onClick={() => handleDelete(latestImage.filePath)}
                      variant="destructive"
                    >
                      <span>Delete</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Thumbnails Gallery using shadcn ScrollArea */}
            {images.length > 1 && showBottomGallery && (
              <div className="h-[140px] min-h-[140px] flex flex-col space-y-2">
                <div className="text-[0.8rem] font-medium ml-1 text-neutral-400">Gallery</div>
                
                {/* Horizontal scrolling thumbnails */}
                <ScrollArea className="w-full pb-2">
                  <div className="flex gap-3">
                    {images.slice(1).map(img => (
                      <div 
                        key={img.filePath} 
                        className="relative group w-[100px] h-[100px] min-w-[100px] rounded-lg overflow-hidden border border-neutral-800/80 bg-neutral-950/60 cursor-pointer flex-shrink-0 transition hover:border-blue-500/50"
                        onClick={() => setLightboxImage(img.filePath)}
                      >
                        <img 
                          src={`file://${img.filePath}`} 
                          alt="Generated thumbnail"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-2">
                          <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(img.filePath);
                              }}
                            title="View"
                          >
                            <Search className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(img.filePath);
                              }}
                            variant="destructive"
                            title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="mt-1" />
                </ScrollArea>
              </div>
            )}

          </div>
        )}

      </main>
    </>
  );
}
