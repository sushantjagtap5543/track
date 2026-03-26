import { grey } from '@mui/material/colors';
import { createTheme } from '@mui/material';
import { loadImage, prepareIcon } from './mapUtil';

import directionSvg from '../../resources/images/direction.svg';
import backgroundSvg from '../../resources/images/background.svg';
import bicycleSvg from '../../resources/images/icon/bicycle.svg';
import busSvg from '../../resources/images/icon/bus.svg';
import motorcycleSvg from '../../resources/images/icon/motorcycle.svg';
import personSvg from '../../resources/images/icon/person.svg';
import truckSvg from '../../resources/images/icon/truck.svg';
import vanSvg from '../../resources/images/icon/van.svg';
import nanoBananaPng from '../../resources/images/icon/nano_banana_marker.png';

export const mapIcons = {
  bicycle: bicycleSvg,
  bus: busSvg,
  car: nanoBananaPng,
  default: nanoBananaPng,
  motorcycle: motorcycleSvg,
  person: personSvg,
  suv: nanoBananaPng,
  truck: truckSvg,
  van: vanSvg,
  nanobanana: nanoBananaPng,
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
  mapImages.background = await prepareIcon(background);
  mapImages.direction = await prepareIcon(await loadImage(directionSvg));
  await Promise.all(
    Object.keys(mapIcons).map(async (category) => {
      const results = [];
      ['info', 'success', 'error', 'neutral'].forEach((color) => {
        results.push(
          loadImage(mapIcons[category]).then((icon) => {
            mapImages[`${category}-${color}`] = prepareIcon(
              background,
              icon,
              theme.palette[color].main,
            );
          }),
        );
      });
      await Promise.all(results);
    }),
  );
};
