/**
 * SkeletonItems komponenta pro načítání položek v seznamu.
 * Moderní tmavý skeleton, přístupný.
 */
export default function SkeletonItems() {
  return (
    <ul className="space-y-2 animate-pulse" aria-label="Načítání položek">
      {[...Array(5)].map((_, i) => (
        <li key={i} className="flex items-center gap-2 border rounded px-3 py-2 bg-zinc-800 border-zinc-700">
          <div className="h-5 w-5 bg-zinc-700 rounded mr-2" />
          <div className="h-4 w-1/3 bg-zinc-700 rounded" />
          <div className="h-3 w-1/4 bg-zinc-700 rounded ml-2" />
        </li>
      ))}
    </ul>
  );
} 