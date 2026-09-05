import { NavLink } from "@/components/nav-link";

const TABS = [
  { href: "/dashboard/manage/purposes", label: "Mục đích chi" },
  { href: "/dashboard/manage/funding-sources", label: "Nguồn tiền" },
  { href: "/dashboard/manage/links", label: "Link" },
] as const;

/**
 * The two dimensions and the share links are all "set it up once" screens, so
 * they share a tab rather than each taking a slot in the bottom bar next to
 * the two screens used daily.
 *
 * Three tabs now rather than two, and the Vietnamese for these dimensions is
 * longer than the word it replaces — "Link công khai" is shortened to "Link"
 * to buy the room back. #138 checks the whole set against a narrow phone.
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
