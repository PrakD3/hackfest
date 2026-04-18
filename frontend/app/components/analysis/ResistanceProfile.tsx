"use client";

interface Props {
  forecast: string | null;
  resistanceFlags?: string[];
}

export function ResistanceProfile({ forecast, resistanceFlags = [] }: Props) {
  if (!forecast && !resistanceFlags.length) {
    return (
      <div className="text-sm text-emerald-600 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        ✓ No resistance concerns identified.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resistanceFlags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resistanceFlags.map((f, index) => (
            <span
              key={`${f}-${index}`}
              className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium"
            >
              ⚠ {f}
            </span>
          ))}
        </div>
      )}
      {forecast && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900 leading-relaxed">
          <strong className="block mb-1">Resistance Forecast (AI)</strong>
          {forecast}
        </div>
      )}
    </div>
  );
}
