interface StepperProps {
  currentStep: number;
  totalSteps: number;
  title: string;
}

export function Stepper({ currentStep, totalSteps, title }: StepperProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <span className="text-lg font-bold text-ink-soft">
          Langkah {currentStep} / {totalSteps}
        </span>
      </div>
      <div className="h-3 w-full bg-surface rounded-full overflow-hidden border border-line">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
