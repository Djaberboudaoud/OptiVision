import { useState, useMemo } from 'react';
import { Filter, Star, Check, ArrowRight, X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { glassesCollection, type Glasses } from '@/data/glassesData';
import type { FaceAnalysisResult } from '@/types/analysis';
import { Glasses3DViewer } from './Glasses3DViewer';
import { ErrorBoundary } from './ErrorBoundary';

interface GlassesRecommendationProps {
  analysisResult: FaceAnalysisResult;
  onSelectGlasses: (glasses: Glasses) => void;
  selectedGlasses: Glasses | null;
  onTryOn?: (glasses: Glasses) => void;
  glasses?: Glasses[];
}

const frameTypes = ['recommended', 'all', 'round', 'square', 'rectangle', 'aviator', 'cat-eye', 'oval'];

const FACE_SHAPE_GLASSES: Record<string, string[]> = {
  "round": ["rectangular", "square", "geometric", "wayfarer"],
  "oval": ["square", "rectangular", "oversized", "geometric"],
  "square": ["round", "oval", "aviator", "thin metal"],
  "heart": ["aviator", "oval", "rimless", "light frame"],
  "diamond": ["oval", "cat-eye", "rimless", "semi-rimless"],
  "rectangle": ["oversized", "square", "large frame", "wayfarer"],
  "oblong": ["oversized", "square", "large frame", "decorative temples"]
};

export function GlassesRecommendation({
  analysisResult,
  onSelectGlasses,
  selectedGlasses,
  onTryOn,
  glasses: glassesProp,
}: GlassesRecommendationProps) {
  const source = glassesProp && glassesProp.length > 0 ? glassesProp : glassesCollection;
  const [activeFilter, setActiveFilter] = useState('recommended');
  const [viewing3DGlasses, setViewing3DGlasses] = useState<string | null>(null);

  const filteredGlasses = useMemo(() => {
    let glasses = source.filter((g) => {
      const isCompatible = g.compatibleFaces.includes(analysisResult.faceShape);
      const mbsInRange = analysisResult.mbs >= g.mbsRange[0] && analysisResult.mbs <= g.mbsRange[1];
      return isCompatible || mbsInRange;
    });

    if (activeFilter === 'recommended') {
      const shapeKey = analysisResult.faceShape.toLowerCase();
      // Handle the case where faceShape might map to a slightly different key in the dictionary
      let mappedKey = shapeKey;
      if (!FACE_SHAPE_GLASSES[shapeKey]) {
         if (shapeKey === 'rectangular') mappedKey = 'rectangle';
      }
      const recommendedKeywords = FACE_SHAPE_GLASSES[mappedKey] || [];
      
      glasses = glasses.filter((g) => {
        const frameLower = g.frameType.toLowerCase();
        const nameLower = g.name.toLowerCase();
        return recommendedKeywords.some(keyword => {
          const kw = keyword.toLowerCase();
          // Map dictionary 'rectangular' back to backend 'rectangle' frameType
          const checkKw = kw === 'rectangular' ? 'rectangle' : kw;
          return frameLower.includes(checkKw) || nameLower.includes(checkKw);
        });
      });
    } else if (activeFilter !== 'all') {
      glasses = glasses.filter((g) => g.frameType === activeFilter);
    }

    return glasses;
  }, [analysisResult, activeFilter, source]);

  const perfectMatches = useMemo(() => {
    return source.filter((g) => {
      const isCompatible = g.compatibleFaces.includes(analysisResult.faceShape);
      const mbsInRange = analysisResult.mbs >= g.mbsRange[0] && analysisResult.mbs <= g.mbsRange[1];
      return isCompatible && mbsInRange;
    });
  }, [analysisResult, source]);

  const viewing3DGlassesData = viewing3DGlasses
    ? source.find(g => g.id === viewing3DGlasses)
    : null;

  return (
    <div className="w-full max-w-6xl mx-auto animate-slide-up">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Recommended Eyeglasses
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Based on your <span className="text-primary font-medium capitalize">{analysisResult.faceShape}</span> face shape
          and <span className="text-primary font-medium">{analysisResult.mbs}mm</span> MBS
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="glass-panel rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-display font-bold text-primary">{perfectMatches.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Perfect Matches</p>
        </div>
        <div className="glass-panel rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-display font-bold text-accent">{filteredGlasses.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Compatible Frames</p>
        </div>
        <div className="glass-panel rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-display font-bold text-foreground capitalize">{analysisResult.faceShape}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Face Shape</p>
        </div>
      </div>

      {/* Filters — scrollable on mobile */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {frameTypes.map((type) => (
          <Button
            key={type}
            variant={activeFilter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(type)}
            className={cn(
              "capitalize flex-shrink-0 text-xs sm:text-sm transition-all",
              type === 'recommended' && activeFilter !== 'recommended' && "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800",
              type === 'recommended' && activeFilter === 'recommended' && "bg-amber-500 text-white hover:bg-amber-600 border-amber-600 shadow-sm shadow-amber-200"
            )}
          >
            {type === 'recommended' ? '✨ Recommended for You' : type === 'all' ? 'All Frames' : type}
          </Button>
        ))}
      </div>

      {/* Glasses grid — 2 cols on mobile, 3-4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {filteredGlasses.map((glasses) => {
          const isPerfectMatch = perfectMatches.some((p) => p.id === glasses.id);
          const isSelected = selectedGlasses?.id === glasses.id;

          return (
            <div
              key={glasses.id}
              className={cn(
                'glasses-card cursor-pointer group relative',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => onSelectGlasses(glasses)}
            >
              {isPerfectMatch && (
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                  <Badge className="bg-accent text-accent-foreground gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
                    <Star className="w-3 h-3" fill="currentColor" />
                    <span className="hidden sm:inline">Perfect Match</span>
                    <span className="sm:hidden">★</span>
                  </Badge>
                </div>
              )}

              {isSelected && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                </div>
              )}

              {/* 360° View Button */}
              <button
                className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                style={isSelected ? { right: '36px' } : {}}
                onClick={(e) => {
                  e.stopPropagation();
                  setViewing3DGlasses(glasses.id);
                }}
                title="View in 360°"
              >
                <RotateCw className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>

              <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 overflow-hidden relative">
                <img
                  src={glasses.image}
                  alt={glasses.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-medium text-xs sm:text-sm flex items-center gap-1">
                    <RotateCw className="w-4 h-4" /> 360° View
                  </span>
                </div>
              </div>

              <div className="p-2 sm:p-4">
                <div className="flex items-start justify-between gap-1 mb-1 sm:mb-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{glasses.brand}</p>
                    <h3 className="font-display font-semibold text-foreground text-xs sm:text-base truncate">{glasses.name}</h3>
                  </div>
                  <p className="font-display font-bold text-primary text-xs sm:text-base flex-shrink-0">{glasses.price} DA</p>
                </div>

                <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs capitalize">
                    {glasses.frameType}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex">
                    {glasses.material}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {glasses.colors.slice(0, 3).map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-border"
                        style={{
                          background: color.toLowerCase().includes('gold')
                            ? 'linear-gradient(135deg, #FFD700, #DAA520)'
                            : color.toLowerCase().includes('silver')
                              ? 'linear-gradient(135deg, #C0C0C0, #A8A8A8)'
                              : color.toLowerCase().includes('black')
                                ? '#1a1a1a'
                                : color.toLowerCase().includes('tortoise')
                                  ? 'linear-gradient(135deg, #8B4513, #654321)'
                                  : '#888',
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                    MBS: {glasses.mbsRange[0]}-{glasses.mbsRange[1]}mm
                  </span>
                </div>

                {/* Try On button on each card */}
                {onTryOn && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 gap-1 text-xs h-7 sm:h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectGlasses(glasses);
                      onTryOn(glasses);
                    }}
                  >
                    Try On <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredGlasses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No glasses match the current filters.</p>
          <Button variant="link" onClick={() => setActiveFilter('all')}>
            Clear filters
          </Button>
        </div>
      )}

      {selectedGlasses && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100%-2rem)]">
          <div className="glass-panel rounded-full px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 shadow-glow">
            <span className="text-xs sm:text-sm font-medium truncate">
              Selected: <span className="text-primary">{selectedGlasses.name}</span>
            </span>
            <Button size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0" onClick={() => onTryOn?.(selectedGlasses)}>
              Try On <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 360° View Modal */}
      {viewing3DGlasses && viewing3DGlassesData && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewing3DGlasses(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {viewing3DGlassesData.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {viewing3DGlassesData.brand} • {viewing3DGlassesData.frameType}
                </p>
              </div>
              <button
                className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                onClick={() => setViewing3DGlasses(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[4/3] w-full">
              <ErrorBoundary fallback={<div className="p-8 text-center text-muted-foreground">Failed to load 3D viewer</div>}>
                <Glasses3DViewer
                  modelUrl={viewing3DGlassesData.webarModelFile || `/models/webar/${viewing3DGlasses}.glb`}
                />
              </ErrorBoundary>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex gap-2">
                {viewing3DGlassesData.colors.slice(0, 4).map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{
                      background: color.toLowerCase().includes('gold')
                        ? 'linear-gradient(135deg, #FFD700, #DAA520)'
                        : color.toLowerCase().includes('silver')
                          ? 'linear-gradient(135deg, #C0C0C0, #A8A8A8)'
                          : color.toLowerCase().includes('black')
                            ? '#1a1a1a'
                            : color.toLowerCase().includes('tortoise')
                              ? 'linear-gradient(135deg, #8B4513, #654321)'
                              : '#888',
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl font-bold text-primary">{viewing3DGlassesData.price} DA</span>
                <Button onClick={() => {
                  onSelectGlasses(viewing3DGlassesData);
                  setViewing3DGlasses(null);
                  if (onTryOn) onTryOn(viewing3DGlassesData);
                }}>
                  Select & Try On
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
