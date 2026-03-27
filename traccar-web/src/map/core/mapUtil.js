import { parse, stringify } from 'wellknown';
import turfCircle from '@turf/circle';

export const loadImage = (url) =>
  new Promise((imageLoaded) => {
    const image = new Image();
    image.onload = () => imageLoaded(image);
    image.src = url;
  });

export const prepareIcon = (background, icon, color) => {
  const canvas = document.createElement('canvas');
  const size = 48 * devicePixelRatio;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const mid = size / 2;
  const radius = size * 0.35;

  // --- Draw Realistic Pin/Teardrop Shape ---
  context.save();
  context.translate(mid, mid * 0.85); // Shift up slightly to make room for tip

  // Drop Shadow
  context.beginPath();
  context.ellipse(0, mid * 0.6, 6 * devicePixelRatio, 2 * devicePixelRatio, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(0,0,0,0.2)';
  context.fill();

  // Pin Body (Teardrop)
  context.beginPath();
  context.arc(0, 0, radius, 0.15 * Math.PI, 0.85 * Math.PI, true);
  context.lineTo(0, radius * 1.5);
  context.closePath();

  // 3D Gradient for Pin
  const grad = context.createRadialGradient(-radius/3, -radius/3, 0, 0, 0, radius);
  grad.addColorStop(0, '#ffffff44');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, color);
  
  context.fillStyle = grad;
  context.shadowBlur = 4 * devicePixelRatio;
  context.shadowColor = 'rgba(0,0,0,0.3)';
  context.fill();

  // White Border
  context.strokeStyle = 'white';
  context.lineWidth = 2 * devicePixelRatio;
  context.stroke();

  // Inner White Circle (The "Hole")
  context.beginPath();
  context.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
  context.fillStyle = 'white';
  context.shadowBlur = 2 * devicePixelRatio;
  context.shadowColor = 'rgba(0,0,0,0.1)';
  context.fill();

  context.restore();

  return canvas.toDataURL();
};

export const getStatusColor = (status, attributes = {}) => {
  if (attributes.alarm) {
    return '#ef4444'; // Alarm Red
  }
  switch (status) {
    case 'online':
      return '#3b82f6'; // Moving Blue
    case 'offline':
      return '#64748b'; // Stopped Gray
    case 'unknown':
    default:
      return '#f59e0b'; // Idle Amber
  }
};

export const getMapColor = (device, position) => {
  return getStatusColor(device.status, position?.attributes || {});
};


export const createCircle = (latitude, longitude, radius) => {
  const circle = turfCircle([longitude, latitude], radius, { units: 'meters' });
  return circle.geometry.coordinates[0].map((c) => [c[1], c[0]]);
};

export const reverseCoordinates = (it) => {
  if (!it) {
    return it;
  }
  if (Array.isArray(it)) {
    if (it.length === 2 && typeof it[0] === 'number' && typeof it[1] === 'number') {
      return [it[1], it[0]];
    }
    return it.map((it) => reverseCoordinates(it));
  }
  return {
    ...it,
    coordinates: reverseCoordinates(it.coordinates),
  };
};

export const geofenceToFeature = (theme, item) => {
  let geometry;
  if (item.area.indexOf('CIRCLE') > -1) {
    const coordinates = item.area
      .replace(/CIRCLE|\(|\)|,/g, ' ')
      .trim()
      .split(/ +/);
    const options = { steps: 32, units: 'meters' };
    const polygon = turfCircle(
      [Number(coordinates[1]), Number(coordinates[0])],
      Number(coordinates[2]),
      options,
    );
    geometry = polygon.geometry;
  } else {
    geometry = reverseCoordinates(parse(item.area));
  }
  return {
    id: item.id,
    type: 'Feature',
    geometry,
    properties: {
      name: item.name,
      color: item.attributes.color || theme.palette.geometry.main,
      width: item.attributes.mapLineWidth || 2,
      opacity: item.attributes.mapLineOpacity || 1,
    },
  };
};

export const geometryToArea = (geometry) => stringify(reverseCoordinates(geometry));

export const findFonts = (map) => {
  const { glyphs } = map.getStyle();
  if (glyphs && glyphs.startsWith('https://tiles.openfreemap.org')) {
    return ['Noto Sans Regular'];
  }
  return ['Open Sans Regular', 'Arial Unicode MS Regular'];
};
