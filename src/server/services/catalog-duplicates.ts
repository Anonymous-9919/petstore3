type DuplicateCandidate = {
  id: string;
  legacyId: number | null;
  categoryId: string;
  sku: string | null;
  name: string;
  nameAr: string;
  basePrice: { toString(): string };
  primaryImagePath: string | null;
  slug: string;
  createdAt: Date;
};

export type DuplicateGroup<T extends DuplicateCandidate = DuplicateCandidate> = {
  key: string;
  match: "sku" | "exact-content";
  canonical: T;
  duplicates: T[];
};

function normalized(value: string | null) {
  return (value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/\s+/g, " ").trim();
}

function signature(product: DuplicateCandidate) {
  const sku = normalized(product.sku);
  if (sku) return { key: `sku:${sku}`, match: "sku" as const };
  const name = normalized(product.name);
  const nameAr = normalized(product.nameAr);
  const image = normalized(product.primaryImagePath);
  if (!name || !nameAr || !image) return null;
  return { key: `content:${product.categoryId}:${name}:${nameAr}:${product.basePrice.toString()}:${image}`, match: "exact-content" as const };
}

function canonicalFirst(a: DuplicateCandidate, b: DuplicateCandidate) {
  return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
}

export function findDuplicateGroups<T extends DuplicateCandidate>(products: T[]): DuplicateGroup<T>[] {
  const candidates = new Map<string, { match: DuplicateGroup<T>["match"]; products: T[] }>();
  for (const product of products) {
    const match = signature(product);
    if (!match) continue;
    const group = candidates.get(match.key) ?? { match: match.match, products: [] };
    group.products.push(product);
    candidates.set(match.key, group);
  }
  return [...candidates.entries()].filter(([, group]) => group.products.length > 1).map(([key, group]) => {
    const [canonical, ...duplicates] = [...group.products].sort(canonicalFirst);
    return { key, match: group.match, canonical, duplicates };
  }).sort((a, b) => canonicalFirst(a.canonical, b.canonical));
}
