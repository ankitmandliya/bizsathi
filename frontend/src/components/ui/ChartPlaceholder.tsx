type ChartPlaceholderProps = {
  title?: string;
  height?: string;
};

export function ChartPlaceholder({ title = 'Performance Overview', height = 'h-48' }: ChartPlaceholderProps) {
  return (
    <div className={`w-full ${height} bg-slate-50 dark:bg-slate-800/40 rounded-lg p-4 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
      <div className="flex items-end justify-center gap-3 h-24 w-full max-w-xs">
        <div className="w-8 bg-indigo-200 dark:bg-indigo-900/50 rounded-t h-12" />
        <div className="w-8 bg-indigo-300 dark:bg-indigo-800/60 rounded-t h-20" />
        <div className="w-8 bg-indigo-400 dark:bg-indigo-700/70 rounded-t h-16" />
        <div className="w-8 bg-indigo-500 dark:bg-indigo-600 rounded-t h-24" />
        <div className="w-8 bg-indigo-300 dark:bg-indigo-800/60 rounded-t h-14" />
      </div>
    </div>
  );
}
