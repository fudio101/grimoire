import type { Category } from "@/lib/db/schema";

export type CategoryNode = Category & { children: CategoryNode[] };

/**
 * The minimum a category needs to be placed in a tree and named.
 *
 * The public report ships exactly this and no more — no timestamps, no rows
 * outside the link's own scope — so the same picker can drive it without the
 * full table crossing the wire to an anonymous visitor.
 */
export type CategoryLike = Pick<Category, "id" | "name" | "parentId">;

/**
 * Build a nested tree from a flat category list. Preserves the input order of
 * `flat` (which getCategories() sorts by name) within each level.
 */
export function buildCategoryTree(flat: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  for (const cat of flat) {
    nodes.set(cat.id, { ...cat, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const cat of flat) {
    const node = nodes.get(cat.id)!;
    const parent = cat.parentId ? nodes.get(cat.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Depth-first flatten of the tree, carrying the depth of each node so callers
 * can render indentation.
 */
export function flattenWithDepth(
  flat: Category[]
): { category: Category; depth: number }[] {
  const result: { category: Category; depth: number }[] = [];

  const walk = (nodes: CategoryNode[], depth: number) => {
    for (const node of nodes) {
      const { children, ...category } = node;
      result.push({ category, depth });
      walk(children, depth + 1);
    }
  };

  walk(buildCategoryTree(flat), 0);
  return result;
}

type CategoryRef = Pick<Category, "id" | "parentId">;

/** A category is a leaf when no other category lists it as parent. */
export function isLeaf(id: string, flat: CategoryRef[]): boolean {
  return !flat.some((c) => c.parentId === id);
}

/** All descendant ids (children, grandchildren, …) of the given category. */
export function getDescendantIds(id: string, flat: CategoryRef[]): string[] {
  const result: string[] = [];

  const walk = (parentId: string) => {
    for (const c of flat) {
      if (c.parentId === parentId) {
        result.push(c.id);
        walk(c.id);
      }
    }
  };

  walk(id);
  return result;
}

/**
 * The top-level ancestor of a category, or the category itself when it is
 * already a root. Overview rolls spending up to this level: "Ăn uống" is a
 * useful answer to "what did the money go on"; "Ăn uống › Nhà hàng › Cơm trưa"
 * is not, and there can be dozens of those.
 */
export function getRootCategory(
  id: string,
  flat: Category[]
): Category | undefined {
  const byId = new Map(flat.map((c) => [c.id, c]));
  let current = byId.get(id);
  const guard = new Set<string>();
  while (current?.parentId && !guard.has(current.id)) {
    guard.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

/** Category names from root → leaf, following parentId recursively. */
export function getCategoryPathParts(
  id: string,
  flat: CategoryLike[]
): string[] {
  const byId = new Map(flat.map((c) => [c.id, c]));
  const parts: string[] = [];

  let current = byId.get(id);
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    parts.unshift(current.name);
    guard.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return parts;
}

/** Human-readable path from root to the category, e.g. "Ăn uống / Cà phê". */
export function getCategoryPath(id: string, flat: CategoryLike[]): string {
  return getCategoryPathParts(id, flat).join(" / ");
}
