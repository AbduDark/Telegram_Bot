import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
}

const colorClasses: Record<string, { bg: string; text: string; shadow: string }> = {
  '#3b82f6': { bg: 'bg-blue-500/20', text: 'text-blue-400', shadow: 'shadow-blue-500/10' },
  '#10b981': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', shadow: 'shadow-emerald-500/10' },
  '#f59e0b': { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-amber-500/10' },
  '#8b5cf6': { bg: 'bg-violet-500/20', text: 'text-violet-400', shadow: 'shadow-violet-500/10' },
  '#ec4899': { bg: 'bg-pink-500/20', text: 'text-pink-400', shadow: 'shadow-pink-500/10' },
  '#06b6d4': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', shadow: 'shadow-cyan-500/10' },
  '#ef4444': { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-red-500/10' },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = '#3b82f6',
  subtitle,
}: StatsCardProps) {
  const classes = colorClasses[color] || colorClasses['#3b82f6'];

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl ${classes.shadow}`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${classes.bg} flex items-center justify-center`}>
          <Icon size={24} className={classes.text} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          {subtitle && <span className="text-xs text-slate-500 mt-1">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
