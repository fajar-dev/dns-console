export function isHostnameInZone(hostname: string, zone: string): boolean {
  return hostname === zone || hostname.endsWith(`.${zone}`)
}

/** Select the most specific zone when both a parent and subdomain are accessible. */
export function findHostnameZone<T extends { name: string }>(hostname: string, zones: readonly T[]): T | undefined {
  return zones.reduce<T | undefined>((match, zone) => {
    if (!isHostnameInZone(hostname, zone.name)) return match
    return !match || zone.name.length > match.name.length ? zone : match
  }, undefined)
}
