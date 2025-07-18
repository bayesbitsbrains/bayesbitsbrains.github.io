interface BlockProps {
  children: React.ReactNode;
  headline?: string;
  color?: string;
}

export default function Block({ children, headline, color = "#f5f5f5" }: BlockProps) {
  if (!headline) {
    return (
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: color }}>
        <div className="px-2 sm:px-4 py-3 text-base leading-relaxed">{children}</div>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg overflow-hidden" style={{ backgroundColor: color }}>
      <div className="px-2 sm:px-4 py-3 border-b border-neutral-200">
        <div className="font-medium text-base">{headline}</div>
      </div>
      <div className="px-2 sm:px-4 py-3 text-base leading-relaxed">{children}</div>
    </div>
  );
}
