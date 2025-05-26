/**
 * SkeletonList komponenta pro načítání seznamů.
 * Moderní tmavý skeleton, přístupný.
 */
export default function SkeletonList() {
  return (
    <ul className="space-y-2 animate-pulse" aria-label="Načítání seznamů">
      {[...Array(4)].map((_, i) => (
        <li key={i} className="border rounded px-3 py-2 bg-zinc-800 border-zinc-700 flex flex-col gap-2">
          <div className="h-4 w-1/2 bg-zinc-700 rounded" />
          <div className="h-3 w-1/3 bg-zinc-700 rounded" />
        </li>
      ))}
    </ul>
  );
} 