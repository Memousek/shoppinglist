/**
 * SkeletonListHeader komponenta pro načítání hlavičky detailu seznamu.
 * Minimalizuje layout shift při načítání.
 */
export default function SkeletonListHeader() {
  return (
    <div className="mb-4 animate-pulse">
      <div className="h-8 w-2/3 bg-zinc-800 rounded mb-2" />
      <div className="h-4 w-1/2 bg-zinc-800 rounded mb-2" />
      <div className="h-3 w-1/4 bg-zinc-800 rounded mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="h-8 w-32 bg-zinc-800 rounded" />
        <div className="h-8 w-32 bg-zinc-800 rounded" />
        <div className="h-8 w-20 bg-zinc-800 rounded" />
      </div>
    </div>
  );
} 