import { NavLink } from "@/components/nav-link";

const TABS = [
  { href: "/dashboard/manage/categories", label: "Danh mục" },
  { href: "/dashboard/manage/links", label: "Link công khai" },
] as const;

/**
 * Categories and share links are both "set it up once" screens, so they
 * share a tab rather than each taking a slot in the bottom bar next to the
 * two screens used daily.
 *
 * Built from plain nav links rather than the Tabs component on purpose.
 * Tabs is a tab-*panel* widget: it owns the selected value and pairs each
 * `role="tab"` with a `tabpanel` in the same document. These switch routes,
 * so the URL is the selected value and there is no panel — `<nav>` with
 * `aria-current="page"` is the honest markup, and it keeps the targets at
 * 44px instead of Tabs' 32px.
 *
 * No data to prefetch here, so unlike the pages below this is a plain
 * server component with no HydrationBoundary — it just composes markup
 * around `{children}`, interleaving `NavLink` (a client leaf) the way any
 * Server Component may.
 */
export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Quản lý</h1>

      <nav aria-label="Mục quản lý">
        <ul className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map((tab) => (
            <li key={tab.href} className="flex-1">
              <NavLink
                href={tab.href}
                className="flex h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors md:h-9"
                activeClassName="bg-background text-foreground shadow-xs"
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  );
}
