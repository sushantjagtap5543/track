import { grey } from '@mui/material/colors';
import { createTheme } from '@mui/material';
import { loadImage, prepareIcon } from './mapUtil';

import directionSvg from '../../resources/images/direction.svg';
import backgroundSvg from '../../resources/images/background.svg';
import bicycleSvg from '../../resources/images/icon/bicycle.svg';
import busSvg from '../../resources/images/icon/bus.svg';
import personSvg from '../../resources/images/icon/person.svg';
import truckSvg from '../../resources/images/icon/truck.svg';
import vanSvg from '../../resources/images/icon/van.svg';
import clean3dCar from '../../resources/images/icon/clean_3d_car.png';
import clean3dSuv from '../../resources/images/icon/clean_3d_suv.png';
import clean3dBike from '../../resources/images/icon/clean_3d_bike.png';

export const mapIcons = {
  bicycle: bicycleSvg,
  bus: busSvg,
  car: clean3dCar,
  default: clean3dCar,
  motorcycle: clean3dBike,
  person: personSvg,
  suv: clean3dSuv,
  truck: truckSvg,
  van: vanSvg,
  nanobanana: clean3dCar,
};

export const mapIconKey = (category) => {
  switch (category) {
    case 'offroad':
    case 'pickup':
      return 'suv';
    case 'trolleybus':
      return 'bus';
    default:
      return mapIcons.hasOwnProperty(category) ? category : 'default';
  }
};

export const mapImages = {};

const theme = createTheme({
  palette: {
    neutral: { main: grey[500] },
  },
});

export default async () => {
  const background = await loadImage(backgroundSvg);
  if (!background) {
    console.error('[MAP] Failed to load core background asset. GPS UI may be degraded.');
  }

  mapImages.background = await prepareIcon(background);
  mapImages.direction = await prepareIcon(await loadImage(directionSvg));
  
  const categories = Object.keys(mapIcons);
  const colors = ['info', 'success', 'error', 'neutral'];
  
  const allIconPromises = categories.map(async (category) => {
    const iconBase = await loadImage(mapIcons[category]);
    if (!iconBase) return;

    for (const color of colors) {
      try {
        const colorValue = theme.palette[color]?.main || theme.palette.info.main;
        mapImages[`${category}-${color}`] = await prepareIcon(
          background,
          iconBase,
          colorValue,
        );
      } catch (e) {
        console.warn(`[MAP] Skip icon: ${category}-${color}`, e);
      }
    }
  });
  
  await Promise.all(allIconPromises);
  console.log(`[MAP] ${Object.keys(mapImages).length} assets preloaded.`);
};
