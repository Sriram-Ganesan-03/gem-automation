// locators/resolve-locator.ts — pure TypeScript, no Playwright imports
export type VersionedLocator = {
  readonly _versioned: true;
  readonly versions: ReadonlyArray<{ readonly since: string; readonly selector: string }>;
};
export type LocatorValue = string | VersionedLocator;

const cmp = (a: string, b: string): number => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return Math.sign(d); }
  return 0;
};

export function resolveLocator(value: LocatorValue, appVersion: string): string {
  if (typeof value === 'string') return value;
  const applicable = value.versions
    .filter(v => cmp(appVersion, v.since) >= 0)
    .sort((x, y) => cmp(y.since, x.since));
  if (applicable.length === 0) {
    // app version older than every known selector — fall back to the oldest entry
    return [...value.versions].sort((x, y) => cmp(x.since, y.since))[0].selector;
  }
  return applicable[0].selector;
}
