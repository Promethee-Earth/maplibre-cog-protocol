import SphericalMercator from "@mapbox/sphericalmercator";
import proj4 from "proj4";

import { Bbox, LatLonZoom, TileIndex, TilePixel } from "../types";

const TILE_SIZE = 256;
const MAX_EXTENT = 2 * 20037508.342789244;

const merc = new SphericalMercator({
  size: TILE_SIZE,
  antimeridian: true,
});

// Définir le système de projection UTM (zone 33N par exemple, à ajuster en fonction de la zone nécessaire)
// const UTM_PROJ = proj4('EPSG:4326', 'EPSG:32633'); // EPSG:4326 pour WGS84, EPSG:32633 pour UTM zone 33N

export const mercatorBboxToUTMBbox = (mercatorBbox: [number, number, number, number]): [number, number, number, number] => {
  // Convertir les coins de la bbox de Web Mercator à latitude/longitude (EPSG:4326)
  const [mercMinX, mercMinY, mercMaxX, mercMaxY] = mercatorBbox;

  // Convertir Web Mercator (EPSG:3857) vers latitude/longitude (EPSG:4326)
  const [minLon, minLat] = proj4('EPSG:3857', 'EPSG:4326', [mercMinX, mercMinY]);
  const [maxLon, maxLat] = proj4('EPSG:3857', 'EPSG:4326', [mercMaxX, mercMaxY]);

  // Convertir les coordonnées (longitude, latitude) en UTM (par exemple, EPSG:32633 pour la zone 33N)
  const [utmMinX, utmMinY] = proj4('EPSG:4326', 'EPSG:32631', [minLon, minLat]);
  const [utmMaxX, utmMaxY] = proj4('EPSG:4326', 'EPSG:32631', [maxLon, maxLat]);

  // Retourner la bbox en UTM
  return [utmMinX, utmMinY, utmMaxX, utmMaxY];
};

export const tileIndexToUTMBbox = ({ x, y, z }: TileIndex): Bbox => {
  // Obtenez les coordonnées de la bbox en Web Mercator (en utilisant la fonction merc.bbox)
  const mercatorBbox = merc.bbox(x, y, z, false, "900913");

  // Convertir les coins de la bbox de Web Mercator à UTM
  const [minLon, minLat, maxLon, maxLat] = mercatorBbox;

  // Convertir les coordonnées (longitude, latitude) en UTM
  const [utmMinX, utmMinY] = proj4("EPSG:4326", "EPSG:32631", [minLon, minLat]);
  const [utmMaxX, utmMaxY] = proj4("EPSG:4326", "EPSG:32631", [maxLon, maxLat]);

  // Retourner la bbox en UTM
  return [utmMinX, utmMinY, utmMaxX, utmMaxY];
};

export const tileIndexToMercatorBbox = ({ x, y, z }: TileIndex): Bbox =>
  merc.bbox(x, y, z, false, "900913");

proj4.defs("EPSG:32631", "+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

export const utmBboxToGeographicBbox = ([
  xMin,
  yMin,
  xMax,
  yMax,
]: Bbox): Bbox => {
  const [minLon, minLat] = proj4("EPSG:32631", "EPSG:4326", [xMin, yMin]);
  const [maxLon, maxLat] = proj4("EPSG:32631", "EPSG:4326", [xMax, yMax]);
  return [minLon, minLat, maxLon, maxLat];
};

export const mercatorBboxToGeographicBbox = ([
  xMin,
  yMin,
  xMax,
  yMax,
]: Bbox): Bbox => [
  ...merc.inverse([xMin, yMin]),
  ...merc.inverse([xMax, yMax]),
];

export const zoomFromResolution = (res: number): number =>
  Math.log2(MAX_EXTENT / (TILE_SIZE * res));

export const tilePixelFromLatLonZoom = ({
  latitude,
  longitude,
  zoom,
}: LatLonZoom): TilePixel => {
  const [mercatorX, mercatorY] = merc.forward([longitude, latitude]);

  const pixelX =
    ((mercatorX + MAX_EXTENT / 2) / MAX_EXTENT) * TILE_SIZE * 2 ** zoom;
  const pixelY =
    (-(mercatorY - MAX_EXTENT / 2) / MAX_EXTENT) * TILE_SIZE * 2 ** zoom;

  return {
    tileIndex: {
      z: zoom,
      x: Math.floor(pixelX / TILE_SIZE),
      y: Math.floor(pixelY / TILE_SIZE),
    },
    row: Math.floor(pixelY % TILE_SIZE),
    column: Math.floor(pixelX % TILE_SIZE),
  };
};
