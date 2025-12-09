import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = '#3b82f6',
  subtitle,
}: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="stats-card-icon" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={24} />
      </div>
      <div className="stats-card-content">
        <h3 className="stats-card-title">{title}</h3>
        <p className="stats-card-value">{value}</p>
        {subtitle && <span className="stats-card-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}
