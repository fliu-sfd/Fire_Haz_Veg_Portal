// Asset ID rules shared by the admin edit panel and the homeowner page.
// The same limits the backend applies (app/schemas/validators.py).
const ASSET_ID_MAX_LENGTH = 32;
const ASSET_ID_PATTERN = /^[A-Z0-9_-]+$/;

export const normalizeAssetId = (value: string) => value.trim().toUpperCase();

export function validateAssetId(value: string): string | undefined {
  const id = normalizeAssetId(value);
  if (!id) return "Enter an asset ID.";
  if (id.length > ASSET_ID_MAX_LENGTH) return `Asset ID must be at most ${ASSET_ID_MAX_LENGTH} characters.`;
  if (!ASSET_ID_PATTERN.test(id)) return "Use only letters, numbers, hyphens, and underscores.";
  return undefined;
}
