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
  
  // 2.0x scale for 3D markers - make them look premium and clear
  const scale = is3D ? 2.0 : 1.0; 
  canvas.width = background.width * devicePixelRatio * scale;
  canvas.height = background.height * devicePixelRatio * scale;
  canvas.style.width = `${background.width * scale}px`;
  canvas.style.height = `${background.height * scale}px`;

  const context = canvas.getContext('2d');

  if (is3D) {
    // 3D Marker: Render only the vehicle asset (floating, no background)
    context.drawImage(icon, 0, 0, canvas.width, canvas.height);
  } else {
    // Standard Vector Pin Logic
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    if (icon) {
      const iconRatio = 0.5;
      const imageWidth = canvas.width * iconRatio;
      const imageHeight = canvas.height * iconRatio;
      context.drawImage(
        icon,
        (canvas.width - imageWidth) / 2,
        (canvas.height - imageHeight) / 2 - (canvas.height * 0.08),
        imageWidth,
        imageHeight,
      );
    }
  }

  return canvas.toDataURL();
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'online':
      return '#4caf50';
    case 'offline':
      return '#9e9e9e';
    case 'unknown':
    default:
      return '#ffc107';
  }
};

export const getMapColor = (device, position) => {
  if (position && position.attributes.alarm) {
    return '#f44336';
  }
  return getStatusColor(device.status);
};

export const createCircle = (latitude, longitude, radius) => {
  const circle = turfCircle([longitude, latitude], radius, { units: 'meters' });
  return circle.geometry.coordinates[0].map((c) => [c[1], c[0]]);
};
