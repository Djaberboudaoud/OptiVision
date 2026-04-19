import { ArrowRight, Sparkles, ScanFace, Glasses } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{ background: 'var(--gradient-hero)' }}
      />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-8 animate-slide-up">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">AI-Powered Eyewear Selection</span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Find Your Perfect
            <br />
            <span className="gradient-text">Eyeglasses</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '200ms' }}>
            Upload your photo, let our AI analyze your face shape, and discover 
            eyewear that's perfectly tailored to your unique features.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <Button size="lg" onClick={onGetStarted} className="gap-2 text-base px-8 h-12 shadow-glow">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-12">
              View Collection
            </Button>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="glass-panel rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
                <ScanFace className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold mb-2">Face Analysis</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered face shape detection and measurement
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display font-semibold mb-2">Smart Matching</h3>
              <p className="text-sm text-muted-foreground">
                Personalized recommendations based on your features
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center mx-auto mb-4">
                <Glasses className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold mb-2">Virtual Try-On</h3>
              <p className="text-sm text-muted-foreground">
                See how glasses look on you in real-time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50" />
        </div>
      </div>
    </section>
  );
}
