import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ResponsiveModal } from "@/components/responsive-modal";
import { getCategoryPath, isLeaf } from "@/lib/category-tree";
import { matchesVi } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/db/schema";

/**
 * What every call site actually wants: a button showing the current selection
 * that opens the picker. Keeps the open/close state here instead of making four
 * different callers each hold the same useState.
 */
export function CategoryPickerField({
  categories,
  value,
  onChange,
  placeholder = "Chọn danh mục",
  className,
  ...rest
}: Omit<CategoryPickerProps, "trigger" | "open" | "onOpenChange"> & {
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = value ? getCategoryPath(value, categories) : null;

  return (
    <CategoryPicker
      {...rest}
      categories={categories}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !label && "text-muted-foreground")}>
            {label ?? placeholder}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      }
    />
  );
}

type Row = {
  category: Category;
  hasChildren: boolean;
  selectable: boolean;
  /** Only set while searching — the ancestor path, shown muted under the name. */
  path?: string;
};

export type CategoryPickerProps = {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  /**
   * Transactions attach to leaves only. Filters and the parent-picker accept any
   * node, since filtering by a parent means its whole subtree.
   */
  selectable?: "leaf" | "all";
  /** Rendered above the list as one-tap shortcuts. Ignored while searching. */
  recentIds?: string[];
  /** Adds a "clear" row at the top, for filters and the root-level parent. */
  clearLabel?: string;
  /**
   * Hidden entirely, along with their subtrees. Used by the parent picker to
   * exclude the category being edited and its descendants — choosing one would
   * make the tree a cycle.
   */
  excludeIds?: Set<string>;
  title?: string;
  trigger: React.ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * A drill-down picker rather than a flat `<Select>` of full paths.
 *
 * The old control rendered every category as "A › B › C" in one list, because a
 * `<select>` collapses leading whitespace so indentation is impossible. At three
 * or four levels that becomes a long list of near-identical strings sharing a
 * prefix, and on a narrow screen the part that distinguishes them — the tail —
 * is the part that gets truncated.
 *
 * Here each screen shows one level at 48px rows, search jumps straight to a leaf
 * with its ancestors shown *beneath* the name (so the distinguishing part is
 * never the part that is cut), and the chips cover the common case in one tap.
 */
export function CategoryPicker({
  title = "Chọn danh mục",
  trigger,
  open,
  onOpenChange,
  ...body
}: CategoryPickerProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      trigger={trigger}
    >
      {/*
       * The body only exists while the picker is open, so every session starts
       * at the top level with an empty query. Resetting that state in an effect
       * keyed on `open` would work too, but it means a second render pass on
       * every open and React rightly flags setState-in-effect as a smell —
       * letting the component mount fresh is the same behaviour without it.
       */}
      {open && <PickerBody {...body} onOpenChange={onOpenChange} />}
    </ResponsiveModal>
  );
}

function PickerBody({
  categories,
  value,
  onChange,
  selectable = "leaf",
  recentIds,
  clearLabel,
  excludeIds,
  onOpenChange,
}: Omit<CategoryPickerProps, "trigger" | "open" | "title">) {
  const [parentId, setParentId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /**
   * The highlight is stored with the list it belongs to. Deriving it this way
   * means changing level or query implicitly moves it back to the top, with no
   * effect and no intermediate render where it points at a row that is gone.
   */
  const [cursorState, setCursorState] = useState({ key: "", idx: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Excluded nodes are removed up front so every downstream view — the level
  // list, the search results, the chips — is filtered by construction rather
  // than each remembering to check.
  const visible = useMemo(
    () =>
      excludeIds?.size
        ? categories.filter((c) => !excludeIds.has(c.id))
        : categories,
    [categories, excludeIds]
  );

  const byId = useMemo(() => new Map(visible.map((c) => [c.id, c])), [visible]);
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Category[]>();
    for (const c of visible) {
      const key = c.parentId ?? null;
      const list = map.get(key);
      if (list) list.push(c);
      else map.set(key, [c]);
    }
    return map;
  }, [visible]);

  const canSelect = (c: Category) =>
    selectable === "all" || isLeaf(c.id, categories);

  const searching = query.trim().length > 0;

  const rows: Row[] = useMemo(() => {
    if (searching) {
      return visible
        .filter((c) => canSelect(c))
        .filter(
          (c) =>
            matchesVi(c.name, query) ||
            matchesVi(getCategoryPath(c.id, categories), query)
        )
        .slice(0, 50)
        .map((c) => {
          const parts = getCategoryPath(c.id, categories).split(" / ");
          return {
            category: c,
            hasChildren: (childrenOf.get(c.id)?.length ?? 0) > 0,
            selectable: true,
            path: parts.slice(0, -1).join(" › "),
          };
        });
    }
    return (childrenOf.get(parentId) ?? []).map((c) => ({
      category: c,
      hasChildren: (childrenOf.get(c.id)?.length ?? 0) > 0,
      selectable: canSelect(c),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, childrenOf, parentId, query, searching, selectable]);

  const contextKey = `${parentId ?? ""}|${query}`;
  const cursor = cursorState.key === contextKey ? cursorState.idx : 0;
  const setCursor = (next: number | ((current: number) => number)) =>
    setCursorState({
      key: contextKey,
      idx: typeof next === "function" ? next(cursor) : next,
    });

  const recent = useMemo(() => {
    if (!recentIds?.length || searching || parentId !== null) return [];
    return recentIds
      .map((id) => byId.get(id))
      .filter((c): c is Category => Boolean(c) && canSelect(c!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentIds, byId, searching, parentId, categories, selectable]);

  const breadcrumb = parentId ? getCategoryPath(parentId, categories) : null;

  const pick = (id: string | null) => {
    onChange(id);
    onOpenChange(false);
  };

  const activate = (row: Row) => {
    if (row.selectable) pick(row.category.id);
    else if (row.hasChildren) setParentId(row.category.id);
  };

  const goUp = () => {
    if (parentId === null) return;
    setParentId(byId.get(parentId)?.parentId ?? null);
  };

  /**
   * Full keyboard control. The `<Select>` this replaces had it for free; a
   * hand-built picker only has it if it is written, and losing it would make
   * the desktop experience worse than what it replaced.
   */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[cursor];
      if (row) activate(row);
    } else if (e.key === "ArrowRight") {
      const row = rows[cursor];
      if (row?.hasChildren && !searching) {
        e.preventDefault();
        setParentId(row.category.id);
      }
    } else if (e.key === "ArrowLeft" || (e.key === "Backspace" && !query)) {
      if (parentId !== null) {
        e.preventDefault();
        goUp();
      }
    }
  };

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <div className="flex flex-col gap-3" onKeyDown={onKeyDown}>
      {parentId !== null && !searching && (
        <button
          type="button"
          onClick={goUp}
          className="-mx-1 flex h-11 items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft className="size-4" />
          <span className="truncate">Quay lại · {breadcrumb}</span>
        </button>
      )}

      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          autoFocus
          value={query}
          placeholder="Tìm danh mục…"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Tìm danh mục"
        />
        {query && (
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Xoá tìm kiếm"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X />
            </Button>
          </InputGroupAddon>
        )}
      </InputGroup>

      {recent.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Dùng gần đây
          </p>
          <div className="flex flex-wrap gap-2">
            {recent.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant={value === c.id ? "default" : "outline"}
                onClick={() => pick(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ul ref={listRef} className="max-h-[45vh] overflow-y-auto">
        {clearLabel && !searching && parentId === null && (
          <li>
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex h-12 w-full items-center justify-between rounded-md px-2 text-left hover:bg-accent"
            >
              <span className="text-muted-foreground">{clearLabel}</span>
              {value === null && <Check className="size-4" />}
            </button>
          </li>
        )}

        {rows.length === 0 && (
          <li className="px-2 py-8 text-center text-sm text-muted-foreground">
            {searching
              ? `Không tìm thấy danh mục nào khớp “${query}”.`
              : "Danh mục này chưa có mục con."}
          </li>
        )}

        {rows.map((row, idx) => {
          const selected = value === row.category.id;
          // A node that is both selectable and has children needs two
          // targets: the row selects it, the chevron goes deeper.
          const splitTarget = row.selectable && row.hasChildren && !searching;
          return (
            <li
              key={row.category.id}
              data-idx={idx}
              className={cn(
                "flex items-stretch rounded-md",
                idx === cursor && "bg-accent"
              )}
            >
              <button
                type="button"
                onClick={() => activate(row)}
                onMouseEnter={() => setCursor(idx)}
                className="flex min-h-12 flex-1 items-center gap-2 px-2 text-left hover:bg-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{row.category.name}</span>
                  {row.path && (
                    <span className="block truncate text-sm text-muted-foreground">
                      {row.path}
                    </span>
                  )}
                </span>
                {selected && <Check className="size-4 shrink-0" />}
                {!splitTarget && row.hasChildren && (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {splitTarget && (
                <button
                  type="button"
                  aria-label={`Mở ${row.category.name}`}
                  onClick={() => setParentId(row.category.id)}
                  className="flex w-12 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                >
                  <ChevronRight className="size-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
