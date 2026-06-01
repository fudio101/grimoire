import type { Category } from "@/lib/db/schema";

export type CategoryNode = Category & { children: CategoryNode[] };

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

/** Category names from root → leaf, following parentId recursively. */
export function getCategoryPathParts(id: string, flat: Category[]): string[] {
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
export function getCategoryPath(id: string, flat: Category[]): string {
  return getCategoryPathParts(id, flat).join(" / ");
}
