import { Glasses } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow">
            <Glasses className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground">OptiVision</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Eyewear</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Collection
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
        </nav>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">Final Year Project</span>
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
        </div>
      </div>
    </header>
  );
}
