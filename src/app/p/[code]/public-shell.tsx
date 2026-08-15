/**
 * The whole page runs one step up the type scale.
 *
 * The dashboard is used by one person who chose this app; this page is read
 * by whoever was sent the link, and it was previously carrying the smallest
 * text in the entire product. The scale is set on the wrapper and the
 * components below avoid `text-sm`, so it actually reaches the content
 * rather than being overridden by every child.
 *
 * No directive: pure markup, safe to render from the segment's server
 * `page.tsx`, its Server Component `not-found.tsx`, and its Client Component
 * `error.tsx` alike.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-[1.0625rem] md:text-lg">
      <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl md:py-10">
        {children}
      </div>
    </div>
  );
}
