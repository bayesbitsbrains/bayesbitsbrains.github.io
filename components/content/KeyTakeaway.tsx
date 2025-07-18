interface KeyTakeawayProps {
  children: React.ReactNode;
}

export default function KeyTakeaway({ children }: KeyTakeawayProps) {
  return (
    <div className="my-6 rounded-lg overflow-hidden bg-amber-50 border border-amber-200">
      <div className="px-2 sm:px-4 py-3 border-b border-amber-200">
        <div className="font-medium text-base text-amber-800 flex items-center gap-2">
          <span className="text-lg">💡</span>
          If there is one thing you remember from this chapter...
        </div>
      </div>
      <div className="px-2 sm:px-4 py-3 text-base leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}