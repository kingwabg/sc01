type StatCardProps = {
  label: string;
  value: string | number;
  tone?: string;
};

export function StatCard({ label, value, tone }: StatCardProps) {
  return (
    <div className={`stat-card ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
