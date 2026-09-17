type BadgeVariant =
  | 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  | 'high' | 'medium' | 'low'
  | 'success' | 'warning' | 'error' | 'info' | 'neutral';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
};

const STATUS_MAP: Record<string, BadgeVariant> = {
  New: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  Converted: 'converted',
  Lost: 'lost',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

export function Badge({ label, variant, dot = true }: BadgeProps) {
  const resolvedVariant = variant ?? STATUS_MAP[label] ?? 'neutral';
  return (
    <span className={`badge badge-${resolvedVariant}`}>
      {dot && <span className="badge-dot" />}
      {label}
    </span>
  );
}

/** Convenience: auto-resolves variant from status/priority string */
export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} />;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge label={priority} />;
}
