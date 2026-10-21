/**
 * Builds the outbreak map as plain SVG paths when the site is built, from
 * Natural Earth country shapes (public domain, via the world-atlas package).
 * Visitors download only the finished SVG: no map library, no map tiles.
 */
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json' with { type: 'json' };

export const MAP_WIDTH = 600;
export const MAP_HEIGHT = 640;

/** ISO 3166-1 numeric codes (used by Natural Earth) for African Union member states. */
const NUMERIC_TO_ISO: Record<string, string> = {
  '012': 'DZ', '024': 'AO', '204': 'BJ', '072': 'BW', '854': 'BF', '108': 'BI', '132': 'CV',
  '120': 'CM', '140': 'CF', '148': 'TD', '174': 'KM', '178': 'CG', '180': 'CD', '384': 'CI',
  '262': 'DJ', '818': 'EG', '226': 'GQ', '232': 'ER', '748': 'SZ', '231': 'ET', '266': 'GA',
  '270': 'GM', '288': 'GH', '324': 'GN', '624': 'GW', '404': 'KE', '426': 'LS', '430': 'LR',
  '434': 'LY', '450': 'MG', '454': 'MW', '466': 'ML', '478': 'MR', '480': 'MU', '504': 'MA',
  '508': 'MZ', '516': 'NA', '562': 'NE', '566': 'NG', '646': 'RW', '678': 'ST', '686': 'SN',
  '690': 'SC', '694': 'SL', '706': 'SO', '710': 'ZA', '728': 'SS', '729': 'SD', '834': 'TZ',
  '768': 'TG', '788': 'TN', '800': 'UG', '894': 'ZM', '716': 'ZW',
};

export interface MapShape {
  /** ISO alpha-2 code for African countries; undefined for other land shown for context. */
  iso: string | undefined;
  d: string;
}

let cache: MapShape[] | undefined;

export function africaShapes(): MapShape[] {
  if (cache) return cache;
  const topology = world as unknown as Topology<{ countries: GeometryCollection }>;
  const all = feature(topology, topology.objects.countries) as FeatureCollection<Geometry>;
  const isAfrican = (f: Feature) => f.id !== undefined && String(f.id) in NUMERIC_TO_ISO;
  const africa: FeatureCollection = { type: 'FeatureCollection', features: all.features.filter(isAfrican) };

  const projection = geoAzimuthalEqualArea()
    .rotate([-18, -2])
    .fitExtent([[8, 8], [MAP_WIDTH - 8, MAP_HEIGHT - 8]], africa)
    .clipExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]]);
  const path = geoPath(projection).digits(1);

  cache = all.features
    .map((f) => ({ iso: isAfrican(f) ? NUMERIC_TO_ISO[String(f.id)] : undefined, d: path(f) ?? '' }))
    .filter((shape) => shape.d.length > 0);
  return cache;
}
