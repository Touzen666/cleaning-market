interface ChartPlaceholderProps {
  height?: number;
  className?: string;
}

// Animowany placeholder dla wykresu słupkowego
export const BarChartPlaceholder = ({
  height = 400,
  className = "",
}: ChartPlaceholderProps) => {
  return (
    <div className={`animate-pulse ${className}`} style={{ height }}>
      <div className="flex h-full items-end justify-center space-x-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-t bg-gray-200"
            style={{
              width: "40px",
              height: `${Math.random() * 60 + 40}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 space-y-2">
        <div className="mx-auto h-4 w-3/4 rounded bg-gray-200"></div>
        <div className="mx-auto h-3 w-1/2 rounded bg-gray-200"></div>
      </div>
    </div>
  );
};

// Animowany placeholder dla wykresu kołowego
export const PieChartPlaceholder = ({
  height = 400,
  className = "",
}: ChartPlaceholderProps) => {
  return (
    <div
      className={`flex animate-pulse flex-col items-center justify-center ${className}`}
      style={{ height }}
    >
      <div className="relative">
        <div className="h-32 w-32 rounded-full border-8 border-gray-200"></div>
        <div className="absolute inset-0 h-32 w-32 animate-spin rounded-full border-8 border-transparent border-t-blue-200"></div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-24 rounded bg-gray-200"></div>
        <div className="h-3 w-16 rounded bg-gray-200"></div>
      </div>
    </div>
  );
};

// Placeholder dla kart z procentami
export const PercentageCardsPlaceholder = ({
  className = "",
}: {
  className?: string;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-gray-100 p-3 text-center"
          >
            <div className="mx-auto mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
            <div className="mx-auto h-8 w-1/2 rounded bg-gray-300"></div>
          </div>
        ))}
      </div>

      <div className="mt-4 animate-pulse rounded-lg bg-gray-100 p-3 text-center">
        <div className="mx-auto mb-2 h-6 w-1/2 rounded bg-gray-200"></div>
        <div className="mx-auto h-4 w-1/3 rounded bg-gray-200"></div>
      </div>
    </div>
  );
};

// Shimmer effect dla wykresów
export const ChartShimmer = ({
  height = 200,
  className = "",
}: ChartPlaceholderProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-100 ${className}`}
      style={{ height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-400">Ładowanie wykresu...</div>
      </div>
    </div>
  );
};

// Dodaj animację shimmer do CSS (dodaj do globals.css)
// @keyframes shimmer {
//   100% {
//     transform: translateX(100%);
//   }
// }
