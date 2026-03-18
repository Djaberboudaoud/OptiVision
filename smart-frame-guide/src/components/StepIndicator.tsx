import { Check, Upload, ScanFace, Sparkles, Glasses } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppStep } from '@/types/analysis';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps: { id: AppStep; label: string; icon: React.ElementType }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'analysis', label: 'Analysis', icon: ScanFace },
  { id: 'recommendations', label: 'Recommend', icon: Sparkles },
  { id: 'tryon', label: 'Try-On', icon: Glasses },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        {/* Connection line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  'step-indicator',
                  isCompleted && 'step-indicator-completed',
                  isActive && 'step-indicator-active',
                  !isCompleted && !isActive && 'step-indicator-pending'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
