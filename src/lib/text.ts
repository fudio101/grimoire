/**
 * Fold Vietnamese text for searching: strip diacritics and normalise đ/Đ.
 *
 * Typing "an uong" must find "Ăn uống" — on a phone the diacritics are extra
 * keystrokes, and someone hunting for a category should not have to reproduce
 * them exactly. NFD splits base letters from their combining marks so the marks
 * can be dropped; đ has no decomposition and is handled separately.
 */
export function foldVi(input: string): string {
  return (
    input
      .normalize("NFD")
      // Escaped rather than written as literal combining marks: those are
      // invisible in most editors and survive a copy-paste only by luck.
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim()
  );
}

/** True when `needle` appears in `haystack`, ignoring diacritics and case. */
export function matchesVi(haystack: string, needle: string): boolean {
  return foldVi(haystack).includes(foldVi(needle));
}
