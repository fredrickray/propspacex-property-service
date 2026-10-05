import { PropertyFilters } from '@property/property.type';

/**
 * Maps a persisted saved-search filter object into {@link PropertyFilters}
 * for {@link PropertyService.listProperties}. Unknown keys remain in storage
 * for future use but are ignored here until listing supports them.
 */
export function mapSavedFiltersToPropertyFilters(
  saved: Record<string, unknown>
): PropertyFilters {
  const pf: PropertyFilters = { isActive: true };

  const num = (v: unknown): number | undefined => {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v : undefined;

  const min = num(saved.price_min ?? saved.minPrice);
  const max = num(saved.price_max ?? saved.maxPrice);
  if (min !== undefined) pf.minPrice = min;
  if (max !== undefined) pf.maxPrice = max;

  const br = num(saved.bedrooms);
  if (br !== undefined) pf.bedrooms = br;

  const ba = num(saved.bathrooms);
  if (ba !== undefined) pf.bathrooms = ba;

  const status = str(saved.status);
  if (status !== undefined) pf.status = status;

  const pt = saved.property_type ?? saved.propertyType;
  if (pt !== undefined) {
    if (Array.isArray(pt)) {
      const types = pt.filter((x): x is string => typeof x === 'string');
      if (types.length > 0) pf.types = types;
    } else if (typeof pt === 'string') {
      pf.type = pt;
    }
  }

  const loc = saved.location;
  if (loc && typeof loc === 'object' && !Array.isArray(loc)) {
    const l = loc as Record<string, unknown>;
    const city = str(l.city);
    const country = str(l.country);
    if (city !== undefined) pf.city = city;
    if (country !== undefined) pf.country = country;
    const lng = num(l.longitude ?? l.lng);
    const lat = num(l.latitude ?? l.lat);
    if (lng !== undefined && lat !== undefined) {
      const r = num(l.radius_km ?? l.radiusKm ?? l.maxDistanceKm);
      pf.near = {
        longitude: lng,
        latitude: lat,
        maxDistanceKm: r !== undefined ? r : 10,
      };
    }
  }

  const topCity = str(saved.city);
  if (topCity !== undefined) pf.city = topCity;
  const topCountry = str(saved.country);
  if (topCountry !== undefined) pf.country = topCountry;

  const featureList: string[] = [];
  if (Array.isArray(saved.features)) {
    for (const f of saved.features) {
      if (typeof f === 'string' && f.trim() !== '') featureList.push(f.trim());
    }
  }
  if (Array.isArray(saved.amenities)) {
    for (const a of saved.amenities) {
      if (typeof a === 'string' && a.trim() !== '') featureList.push(a.trim());
    }
  }
  if (featureList.length > 0) {
    pf.features = [...new Set(featureList)];
  }

  const search = str(saved.search);
  if (search !== undefined) pf.search = search;

  return pf;
}
