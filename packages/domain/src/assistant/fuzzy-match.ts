function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function levenshteinDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row]![0] = row;
  }
  for (let col = 0; col < cols; col += 1) {
    matrix[0]![col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row]![col] = Math.min(
        matrix[row - 1]![col]! + 1,
        matrix[row]![col - 1]! + 1,
        matrix[row - 1]![col - 1]! + cost,
      );
    }
  }

  return matrix[rows - 1]![cols - 1]!;
}

export function scoreNameMatch(query: string, candidate: string): number {
  const queryNormalized = normalizeName(query);
  const candidateNormalized = normalizeName(candidate);

  if (!queryNormalized || !candidateNormalized) {
    return 0;
  }

  if (queryNormalized === candidateNormalized) {
    return 1;
  }

  if (
    candidateNormalized.includes(queryNormalized) ||
    queryNormalized.includes(candidateNormalized)
  ) {
    return 0.92;
  }

  const queryTokens = queryNormalized.split(/\s+/).filter((token) => token.length > 2);
  const candidateTokens = candidateNormalized.split(/\s+/);

  if (queryTokens.length === 0) {
    return 0;
  }

  const matchedTokens = queryTokens.filter((token) =>
    candidateTokens.some(
      (candidateToken) =>
        candidateToken.includes(token) ||
        token.includes(candidateToken) ||
        levenshteinDistance(token, candidateToken) <= 2,
    ),
  ).length;

  if (queryTokens.length === 1) {
    const bestDistance = Math.min(
      ...candidateTokens.map((candidateToken) =>
        levenshteinDistance(queryTokens[0]!, candidateToken),
      ),
      queryNormalized.length,
    );
    if (bestDistance <= 2) {
      return 0.78;
    }
  }

  return matchedTokens / queryTokens.length;
}

export function findBestNameMatch<T extends { name: string }>(
  query: string,
  items: T[],
  minScore = 0.55,
): T | null {
  let best: { item: T; score: number } | null = null;

  for (const item of items) {
    const score = scoreNameMatch(query, item.name);
    if (score >= minScore && (!best || score > best.score)) {
      best = { item, score };
    }
  }

  return best?.item ?? null;
}

export function findTableByReference(
  reference: string,
  tables: Array<{ number: number; label?: string }>,
): { number: number; label?: string } | null {
  const normalized = normalizeName(reference);
  const numeric = Number(normalized.replace(/[^0-9]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) {
    const byNumber = tables.find((table) => table.number === numeric);
    if (byNumber) {
      return byNumber;
    }
  }

  for (const table of tables) {
    const label = normalizeName(table.label ?? "");
    if (label && (normalized.includes(label) || label.includes(normalized))) {
      return table;
    }
  }

  return null;
}
