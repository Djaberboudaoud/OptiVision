import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { StepIndicator } from '@/components/StepIndicator';
import { ImageUpload } from '@/components/ImageUpload';
import { FaceAnalysis } from '@/components/FaceAnalysis';
import { GlassesRecommendation } from '@/components/GlassesRecommendation';
import TryOnModal from '@/components/TryOnModal';
import { CartWidget, type CartItem } from '@/components/CartWidget';
import { ChatAssistant } from '@/components/ChatAssistant';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { AppStep, FaceAnalysisResult } from '@/types/analysis';
import type { Glasses } from '@/data/glassesData';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [showHero, setShowHero] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FaceAnalysisResult | null>(null);
  const [selectedGlasses, setSelectedGlasses] = useState<Glasses | null>(null);
  // Fullscreen try-on modal state
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Glasses state
  const [apiGlasses, setApiGlasses] = useState<Glasses[]>([]);
  const [chatFilteredGlasses, setChatFilteredGlasses] = useState<Glasses[] | null>(null);
  const [activeFilterLabel, setActiveFilterLabel] = useState<string | null>(null);

  useEffect(() => {
    const fetchGlasses = async () => {
      try {
        const { getAllGlasses } = await import('@/services/api');
        const data = await getAllGlasses();
        if (data && data.length > 0) {
          // Transform backend data to frontend Glasses interface
          const transformedGlasses: Glasses[] = data.map((item: any) => ({
            id: item.id.toString(),
            name: item.glasses_name,
            brand: item.brand || 'Custom',
            image: item.image_path ? `http://localhost:8001/glasses_photos/${item.image_path}` : 'https://placehold.co/400x300',
            frameType: (item.frame_shape || item.frame_type || 'rectangle').toLowerCase(),
            material: item.material || 'Acetate',
            mbsRange: [130, 140], // Default
            compatibleFaces: ['oval', 'round', 'heart', 'square', 'oblong'], // Default all
            price: item.selling_price,
            colors: item.frame_color ? [item.frame_color] : ['Black'],
            modelFile: item.model_path, // Path relative to glasses_models/
            webarModelFile: item.model_path ? `http://localhost:8001/glasses_models/${item.model_path}` : undefined,
          }));
          setApiGlasses(transformedGlasses);
        }
      } catch (err) {
        console.error('Failed to load glasses from API', err);
      }
    };
    fetchGlasses();
  }, []);

  // ── Chat filter handler → updates the main glasses grid ──
  const handleChatFilter = useCallback((filters: Record<string, any>, glasses?: any[]) => {
    if (glasses && glasses.length > 0) {
      const transformed: Glasses[] = glasses.map((item: any) => ({
        id: item.id.toString(),
        name: item.glasses_name,
        brand: item.brand || 'Custom',
        image: item.image_path ? `http://localhost:8001/glasses_photos/${item.image_path}` : 'https://placehold.co/400x300',
        frameType: (item.frame_shape || item.frame_type || 'rectangle').toLowerCase(),
        material: item.material || 'Acetate',
        mbsRange: [130, 140] as [number, number],
        compatibleFaces: ['oval', 'round', 'heart', 'square', 'oblong'],
        price: item.selling_price,
        colors: item.frame_color ? [item.frame_color] : ['Black'],
        modelFile: undefined,
        webarModelFile: undefined,
      }));
      setChatFilteredGlasses(transformed);

      // Build label from filters
      const parts: string[] = [];
      if (filters.san_glasses) parts.push('Sunglasses');
      if (filters.anti_blue_light) parts.push('Anti-Blue Light');
      if (filters.gender) parts.push(filters.gender);
      if (filters.frame_type) parts.push(filters.frame_type);
      if (filters.frame_shape) parts.push(filters.frame_shape);
      if (filters.frame_color) parts.push(filters.frame_color);
      setActiveFilterLabel(parts.join(' · ') || 'Filtered');

      // Auto-navigate to recommendations if not there
      if (currentStep !== 'recommendations') {
        setShowHero(false);
        setCurrentStep('recommendations');
        // Ensure we have a fake analysis result so the page renders
        if (!analysisResult) {
          setAnalysisResult({
            faceShape: 'oval',
            mbs: 135,
            confidence: 0.9,
            landmarks: [],
            measurements: { faceWidth: 140, faceHeight: 180, pupillaryDistance: 63, noseBridgeWidth: 18 },
          });
        }
      }
    } else {
      setActiveFilterLabel('No matches');
    }
  }, [currentStep, analysisResult]);

  const clearChatFilter = useCallback(() => {
    setChatFilteredGlasses(null);
    setActiveFilterLabel(null);
  }, []);

  const handleGetStarted = () => {
    setShowHero(false);
    setCurrentStep('upload');
  };

  const handleImageUpload = useCallback((file: File, previewUrl: string) => {
    setUploadedImage(previewUrl);
    setUploadedImageFile(file);
    setTimeout(() => {
      setCurrentStep('analysis');
    }, 1000);
  }, []);

  const handleAnalysisComplete = useCallback((result: FaceAnalysisResult) => {
    setAnalysisResult(result);
    setTimeout(() => {
      setCurrentStep('recommendations');
    }, 1500);
  }, []);

  const handleSelectGlasses = useCallback((glasses: Glasses) => {
    setSelectedGlasses(glasses);
  }, []);

  const handleTryOn = useCallback((glasses: Glasses) => {
    setSelectedGlasses(glasses);
    setShowTryOnModal(true);
  }, []);

  const handleCloseTryOn = useCallback(() => {
    setShowTryOnModal(false);
  }, []);

  const handleAddToCart = useCallback((glasses: Glasses) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.glasses.id === glasses.id);
      if (existing) {
        return prev.map((item) =>
          item.glasses.id === glasses.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { glasses, quantity: 1 }];
    });
  }, []);

  const handleRemoveFromCart = useCallback((glassesId: string) => {
    setCartItems((prev) => prev.filter((item) => item.glasses.id !== glassesId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const handleBack = () => {
    const steps: AppStep[] = ['upload', 'analysis', 'recommendations'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      setShowHero(true);
    }
  };

  const handleNext = () => {
    const steps: AppStep[] = ['upload', 'analysis', 'recommendations'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 'upload':
        return !!uploadedImage;
      case 'analysis':
        return !!analysisResult;
      default:
        return false;
    }
  };

  if (showHero) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <HeroSection onGetStarted={handleGetStarted} />
        <ChatAssistant onFilterRequest={handleChatFilter} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-4 sm:py-8">
        <StepIndicator currentStep={currentStep} />

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {currentStep !== 'recommendations' && (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Step content */}
        <div className="pb-24">
          {currentStep === 'upload' && (
            <ImageUpload onImageUpload={handleImageUpload} />
          )}

          {currentStep === 'analysis' && uploadedImage && uploadedImageFile && (
            <FaceAnalysis
              imageUrl={uploadedImage}
              imageFile={uploadedImageFile}
              onAnalysisComplete={handleAnalysisComplete}
            />
          )}

          {currentStep === 'recommendations' && analysisResult && (
            <>
              {activeFilterLabel && (
                <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                  <span className="text-sm font-medium text-primary">
                    🔍 AI Filter: {activeFilterLabel}
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearChatFilter} className="text-xs h-7">
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                </div>
              )}
              <GlassesRecommendation
                analysisResult={analysisResult}
                onSelectGlasses={handleSelectGlasses}
                selectedGlasses={selectedGlasses}
                onTryOn={handleTryOn}
                glasses={chatFilteredGlasses || apiGlasses}
              />
            </>
          )}
        </div>
      </main>

      {/* ═══ Try-On Modal (Warby Parker style) ═══ */}
      {showTryOnModal && selectedGlasses && (
        <TryOnModal
          glasses={selectedGlasses}
          allGlasses={apiGlasses}
          onClose={handleCloseTryOn}
          onSelectGlasses={setSelectedGlasses}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ═══ Floating Cart Widget ═══ */}
      <CartWidget
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />

      <ChatAssistant onFilterRequest={handleChatFilter} />
    </div>
  );
};

export default Index;
