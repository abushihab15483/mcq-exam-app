import Card from "@/components/ui/Card";

interface StatsCardProps {
  label: string;
  value: string | number;
}

export default function StatsCard({ label, value }: StatsCardProps) {
  return (
    <Card>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="font-mono text-3xl font-semibold text-ink mt-1">{value}</p>
    </Card>
  );
}
