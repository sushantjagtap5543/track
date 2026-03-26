import { parse, stringify } from 'wellknown';
import turfCircle from '@turf/circle';

export const loadImage = (url) =>
  new Promise((imageLoaded) => {
    const image = new Image();
    image.onload = () => imageLoaded(image);
    image.src = url;
  });

const canvasTintImage = (image, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width * devicePixelRatio;
  canvas.height = image.height * devicePixelRatio;
  canvas.style.width = `${image.width}px`;
  canvas.style.height = `${image.height}px`;

  const context = canvas.getContext('2d');

  context.save();
  context.fillStyle = color;
  context.globalAlpha = 1;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'destination-atop';
  context.globalAlpha = 1;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.restore();

  return canvas;
};

export const prepareIcon = (background, icon, color) => {
  const is3D = icon && icon.src && (icon.src.endsWith('.png') || icon.src.includes('clean_3d'));
  const canvas = document.createElement('canvas');
  
  // Use a fixed size for the simple/attractive circular marker
  const baseSize = 42;
  canvas.width = baseSize * devicePixelRatio;
  canvas.height = baseSize * devicePixelRatio;
  canvas.style.width = `${baseSize}px`;
  canvas.style.height = `${baseSize}px`;

  const context = canvas.getContext('2d');
  const size = canvas.width;

  // --- Draw Attractive Circular Background (The Halo) ---
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  context.fillStyle = '#ffffff'; // White border
  context.fill();
  
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
  context.fillStyle = color; // Core color (Green/Red/Gray)
  context.fill();

  // Draw Inner Icon
  if (icon) {
    const iconRatio = is3D ? 0.75 : 0.6;
    const imageWidth = size * iconRatio;
    const imageHeight = size * iconRatio;
    
    context.drawImage(
      icon,
      (size - imageWidth) / 2,
      (size - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
  }

  return canvas.toDataURL();
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'online':
      return '#22c55e'; // Vibrant Green
    case 'offline':
      return '#64748b'; // Sleek Gray
    case 'unknown':
    default:
      return '#f59e0b'; // Amber
  }
};

export const getMapColor = (device, position) => {
  if (position && position.attributes.alarm) {
    return '#ef4444'; // Danger Red
  }
  return getStatusColor(device.status);
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
