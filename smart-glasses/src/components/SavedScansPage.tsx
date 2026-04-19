import { useEffect, useState } from 'react';
import { Trash2, Download, Camera, ArrowLeft, Clock, Ruler, Brain } from 'lucide-react';
import { getAllScans, deleteScan, type SavedScan } from '@/services/savedScans';

interface SavedScansPageProps {
  onBack: () => void;
}

export function SavedScansPage({ onBack }: SavedScansPageProps) {
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<SavedScan | null>(null);

  useEffect(() => {
    loadScans();
  }, []);

  async function loadScans() {
    setLoading(true);
    try {
      const all = await getAllScans();
      setScans(all);
    } catch (e) {
      console.error('Failed to load scans:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteScan(id);
    setScans(prev => prev.filter(s => s.id !== id));
    if (selectedScan?.id === id) setSelectedScan(null);
  }

  function handleDownload(scan: SavedScan, e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = scan.photoDataUrl;
    a.download = `optivision-scan-${new Date(scan.savedAt).toLocaleDateString('en-GB').replace(/\//g, '-')}.png`;
    a.click();
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const shapeEmoji: Record<string, string> = {
    oval: '🥚', round: '⭕', square: '⬜', heart: '❤️', oblong: '📏'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Saved Scans</h1>
          <p className="text-sm text-muted-foreground">{scans.length} scan{scans.length !== 1 ? 's' : ''} saved on this device</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading your saved scans...</p>
          </div>
        ) : scans.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <Camera className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">No saved scans yet</h2>
            <p className="text-muted-foreground max-w-xs">
              Scan your face on the home page and your results will be automatically saved here.
            </p>
            <button
              onClick={onBack}
              className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Start a Scan
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Grid of scans */}
            <div className="lg:col-span-2">
              <div className="grid sm:grid-cols-2 gap-4">
                {scans.map(scan => (
                  <div
                    key={scan.id}
                    onClick={() => setSelectedScan(scan)}
                    className={`
                      relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200
                      border-2 hover:scale-[1.02] hover:shadow-xl
                      ${selectedScan?.id === scan.id
                        ? 'border-primary shadow-lg shadow-primary/20'
                        : 'border-border hover:border-primary/50'}
                    `}
                  >
                    {/* Photo */}
                    <div className="aspect-square bg-muted">
                      <img
                        src={scan.photoDataUrl}
                        alt="Face scan"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Overlay info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{shapeEmoji[scan.faceShape] || '😊'}</span>
                          <span className="text-white font-semibold capitalize text-sm">{scan.faceShape}</span>
                          <span className="ml-auto text-white/70 text-xs">{Math.round(scan.confidence * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/60 text-xs">
                          <Clock className="w-3 h-3" />
                          {formatDate(scan.savedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (appear on hover) */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDownload(scan, e)}
                        className="w-8 h-8 bg-black/60 hover:bg-black/80 backdrop-blur rounded-lg flex items-center justify-center text-white transition-colors"
                        title="Download photo"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(scan.id, e)}
                        className="w-8 h-8 bg-red-500/80 hover:bg-red-600 backdrop-blur rounded-lg flex items-center justify-center text-white transition-colors"
                        title="Delete scan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-1">
              {selectedScan ? (
                <div className="glass-panel rounded-2xl p-6 sticky top-24 animate-slide-up">
                  <img
                    src={selectedScan.photoDataUrl}
                    alt="Selected scan"
                    className="w-full aspect-square object-cover rounded-xl mb-4"
                  />
                  <h3 className="font-display font-bold text-lg text-foreground mb-4">Analysis Details</h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10">
                      <Brain className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Face Shape</p>
                        <p className="font-semibold text-foreground capitalize">
                          {shapeEmoji[selectedScan.faceShape]} {selectedScan.faceShape}
                        </p>
                      </div>
                      <span className="ml-auto text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                        {Math.round(selectedScan.confidence * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">MBS Size</p>
                        <p className="font-bold text-foreground">{selectedScan.mbs} <span className="text-xs font-normal">mm</span></p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Pupil Distance</p>
                        <p className="font-bold text-foreground">{selectedScan.pupillaryDistance} <span className="text-xs font-normal">mm</span></p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Face Width</p>
                        <p className="font-bold text-foreground">{selectedScan.faceWidth} <span className="text-xs font-normal">mm</span></p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Face Height</p>
                        <p className="font-bold text-foreground">{selectedScan.faceHeight} <span className="text-xs font-normal">mm</span></p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Saved {formatDate(selectedScan.savedAt)}
                    </p>

                    <button
                      onClick={(e) => handleDownload(selectedScan, e)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Photo
                    </button>
                    <button
                      onClick={(e) => handleDelete(selectedScan.id, e)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Scan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 py-16">
                  <Ruler className="w-10 h-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Click on a scan to see its full details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
