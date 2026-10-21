import boundary from "@/constants/oriental-mindoro.json";

export const ORIENTAL_MINDORO_BOUNDARY = boundary;
export const SERVICE_AREA_ERROR =
  "This location is outside Oriental Mindoro. Pickup routes are available only within Oriental Mindoro.";

function inRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [px, py] = ring[j];
    const cross = (lng - x) * (py - y) - (lat - y) * (px - x);
    if (
      Math.abs(cross) < 1e-10 &&
      lng >= Math.min(x, px) &&
      lng <= Math.max(x, px) &&
      lat >= Math.min(y, py) &&
      lat <= Math.max(y, py)
    )
      return true;
    if (y > lat !== py > lat && lng < ((px - x) * (lat - y)) / (py - y) + x)
      inside = !inside;
  }
  return inside;
}

export function isInServiceArea(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const geometry = boundary.geometry;
  const polygons =
    geometry.type === "MultiPolygon"
      ? (geometry.coordinates as number[][][][])
      : [geometry.coordinates as unknown as number[][][]];
  return polygons.some(
    (rings) =>
      inRing(longitude, latitude, rings[0]) &&
      !rings.slice(1).some((hole) => inRing(longitude, latitude, hole)),
  );
}

/** Draw a passive outline without changing map gestures or the viewport. */
export const serviceAreaMapScript = (mapName: string) => `
  var r4rOutline = L.geoJSON(${JSON.stringify(boundary)}, {
    style: {color: '#FEC103', weight: 3, fill: false},
    interactive: false,
    smoothFactor: 2
  }).addTo(${mapName});
  window.r4rMindoroBounds = r4rOutline.getBounds();
  L.control.attribution({prefix: false}).addTo(${mapName}).addAttribution('Boundary: NAMRIA / PSA / OCHA, geoBoundaries (CC BY 3.0 IGO)');
`;

/**
 * Lock a Leaflet map to Oriental Mindoro:
 * - Focus backdrop: Dims and greys out everything outside the province (0.65 opacity).
 * - Primary border: Bright #FEC103 border line outlining Oriental Mindoro.
 * - Restricts panning to the province bounds and prevents zooming out past it.
 * - Exposes `window.r4rIsInServiceArea(lat, lng)` and `window.r4rMindoroBounds`.
 */
export const serviceAreaLockScript = (mapName: string, lockViewport = true) => `
  (function () {
    var R4R_BOUNDARY = ${JSON.stringify(boundary)};
    var geom = R4R_BOUNDARY.geometry;
    var polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];

    function inRing(lng, lat, ring) {
      var inside = false;
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var x = ring[i][0], y = ring[i][1], px = ring[j][0], py = ring[j][1];
        if ((y > lat) !== (py > lat) && lng < ((px - x) * (lat - y)) / (py - y) + x) inside = !inside;
      }
      return inside;
    }

    window.r4rIsInServiceArea = function (lat, lng) {
      return polygons.some(function (rings) {
        return inRing(lng, lat, rings[0]) &&
          !rings.slice(1).some(function (hole) { return inRing(lng, lat, hole); });
      });
    };

    // Deep focus backdrop: whole world with Oriental Mindoro cut out as holes
    var world = [[-89.9, -179.9], [-89.9, 179.9], [89.9, 179.9], [89.9, -179.9]];
    var holes = polygons.map(function (rings) {
      return rings[0].map(function (c) { return [c[1], c[0]]; });
    });
    L.polygon([world].concat(holes), {
      stroke: false,
      fillColor: '#0F172A',
      fillOpacity: 0.65,
      interactive: false,
      smoothFactor: 2
    }).addTo(${mapName});

    // Glowing underlay for primary border
    L.geoJSON(R4R_BOUNDARY, {
      style: { color: 'rgba(254, 193, 3, 0.35)', weight: 7, fill: false },
      interactive: false,
      smoothFactor: 2
    }).addTo(${mapName});

    // Sharp Primary Yellow/Gold Border Line
    var outline = L.geoJSON(R4R_BOUNDARY, {
      style: { color: '#FEC103', weight: 3.5, fill: false, opacity: 1.0 },
      interactive: false,
      smoothFactor: 2
    }).addTo(${mapName});

    var bounds = outline.getBounds();
    window.r4rMindoroBounds = bounds;
    ${lockViewport ? `
    ${mapName}.setMaxBounds(bounds.pad(0.08));
    ${mapName}.options.maxBoundsViscosity = 1.0;

    function applyMinZoom() {
      var fitZoom = ${mapName}.getBoundsZoom(bounds, false);
      ${mapName}.setMinZoom(Math.max(7, fitZoom));
    }
    applyMinZoom();
    setTimeout(applyMinZoom, 300);

    ` : ""}

    L.control.attribution({ prefix: false }).addTo(${mapName})
      .addAttribution('Boundary: NAMRIA / PSA / OCHA, geoBoundaries (CC BY 3.0 IGO)');
  })();
`;
