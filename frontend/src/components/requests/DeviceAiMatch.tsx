import { Sparkles, Loader2 } from "lucide-react";

interface DeviceAiMatchProps {
  checkingModel: boolean;
  activeField: "brand" | "model" | null;
  isAppliance: boolean;
  isRubbish: boolean;
  modelSuggestions: {brand: string; model: string; deviceType?: string; specs: string}[];
  deeperSearch: boolean;
  onSelectSuggestion: (brand: string, model: string, deviceType?: string) => void;
  onSearchDeeper: () => void;
}

export default function DeviceAiMatch({
  checkingModel,
  activeField,
  isAppliance,
  isRubbish,
  modelSuggestions,
  deeperSearch,
  onSelectSuggestion,
  onSearchDeeper
}: DeviceAiMatchProps) {
  if (checkingModel && activeField) {
    return null;
  }

  if (isAppliance) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Sorry, we do not repair large home appliances like fridges or ovens.
          </p>
        </div>
      </div>
    );
  }

  if (isRubbish) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex items-center gap-3">
          <span className="text-xl">🤔</span>
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            We couldn't recognize this device. Please enter a valid electronic device brand and model.
          </p>
        </div>
      </div>
    );
  }

  if (modelSuggestions.length > 0) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="bg-[var(--background)] px-4 py-2 border-b border-[var(--border)]">
          <p className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-dark)]">
            <Sparkles size={14} className="text-[var(--primary)]" />
            AI Assistant Match
          </p>
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Did you mean one of these devices?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {modelSuggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSuggestion(sug.brand, sug.model, sug.deviceType)}
                className="flex flex-col items-start rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left transition hover:border-[var(--accent-dark)] hover:bg-[var(--mint-50)]"
              >
                <span className="text-sm font-bold text-[var(--foreground)]">{sug.brand} {sug.model}</span>
                {sug.specs && <span className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">{sug.specs}</span>}
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onSearchDeeper}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted-foreground)] transition hover:bg-[var(--mint-50)] hover:text-[var(--foreground)]"
            >
              {deeperSearch ? "Still not right? Search again" : "None of these? Search deeper"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
