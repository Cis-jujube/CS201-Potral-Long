interface QuickAccessPanelProps {
  links: Array<{ label: string; href: string; description: string }>;
}

export function QuickAccessPanel({ links }: QuickAccessPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {links.map((link) => (
        <a key={link.href} href={link.href} className="surface-card-hover p-4">
          <p className="text-sm font-semibold">{link.label}</p>
          <p className="mt-1 text-xs text-muted">{link.description}</p>
        </a>
      ))}
    </div>
  );
}
