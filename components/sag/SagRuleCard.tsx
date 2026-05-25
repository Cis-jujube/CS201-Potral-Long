interface SagRuleCardProps {
  title: string;
  value: string;
}

export function SagRuleCard({ title, value }: SagRuleCardProps) {
  return (
    <article className="surface-card-hover p-4">
      <p className="kicker">{title}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </article>
  );
}
