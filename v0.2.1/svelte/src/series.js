function slugify(base, fallback = 'series') {
  return (base || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

export function makeSeriesId(seriesName, fallback = 'series') {
  const rawSlug = slugify(seriesName, fallback).replace(/\./g, '-');
  const withoutSuffix = rawSlug.replace(/-series$/i, '').replace(/-+$/, '');
  const cleaned = withoutSuffix || rawSlug;
  return cleaned || slugify(fallback, 'series');
}

export function deriveSeriesId(entry, { seriesName, fallbackTitle = 'unknown' } = {}) {
  const candidates = [
    entry?.seriesId,
    entry?.data?.seriesId,
    entry?.apicurioArtifactId,
    seriesName,
    entry?.title,
    entry?.apicurioArtifactName,
    entry?.data?.title,
    fallbackTitle
  ];
  const trimmed = candidates.map(c => (c ?? '').toString().trim());
  const foundIndex = trimmed.findIndex(Boolean);
  const base = foundIndex !== -1 ? trimmed[foundIndex] : '';
  if (!base) {
    console.log('[Series] deriveSeriesId: no base found; fallback', { fallbackTitle });
    return null;
  }
  console.log('[Series] deriveSeriesId: picked base', {
    base,
    sourceIndex: foundIndex,
    candidates: trimmed
  });
  return makeSeriesId(base, fallbackTitle);
}

export function ensureSeriesId(entry, { seriesName, fallbackTitle = 'unknown' } = {}) {
  if (!entry || typeof entry !== 'object') return null;
  const seriesId = deriveSeriesId(entry, { seriesName, fallbackTitle });
  if (!seriesId) return null;
  entry.seriesId = seriesId;
  if (!entry.apicurioArtifactId) entry.apicurioArtifactId = seriesId;
  return seriesId;
}

export function getSeriesId(entry, options = {}) {
  if (!entry) return null;
  const hasSeriesSignal = entry.isSeries
    || (entry.apicurioVersions?.length > 1)
    || entry.seriesId
    || entry.data?.seriesId
    || entry.apicurioArtifactId;
  if (!hasSeriesSignal && !options.force) return null;
  const seriesId = deriveSeriesId(entry, options);
  if (seriesId) return seriesId;
  if (hasSeriesSignal) {
    return makeSeriesId(options.fallbackTitle || 'unknown');
  }
  return null;
}
