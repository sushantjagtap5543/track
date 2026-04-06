import { grey } from '@mui/material/colors';
import { createTheme } from '@mui/material';
import { loadImage, prepareIcon } from './mapUtil';

import directionSvg from '../../resources/images/direction.svg';
import backgroundSvg from '../../resources/images/background.svg';
import animalSvg from '../../resources/images/icon/animal.svg';
import bicycleSvg from '../../resources/images/icon/bicycle.svg';
import boatSvg from '../../resources/images/icon/boat.svg';
import busSvg from '../../resources/images/icon/bus.svg';
import carSvg from '../../resources/images/icon/car.svg';
import camperSvg from '../../resources/images/icon/camper.svg';
import craneSvg from '../../resources/images/icon/crane.svg';
import defaultSvg from '../../resources/images/icon/default.svg';
import startSvg from '../../resources/images/icon/start.svg';
import finishSvg from '../../resources/images/icon/finish.svg';
import helicopterSvg from '../../resources/images/icon/helicopter.svg';
import motorcycleSvg from '../../resources/images/icon/motorcycle.svg';
import personSvg from '../../resources/images/icon/person.svg';
import planeSvg from '../../resources/images/icon/plane.svg';
import scooterSvg from '../../resources/images/icon/scooter.svg';
import shipSvg from '../../resources/images/icon/ship.svg';
import tractorSvg from '../../resources/images/icon/tractor.svg';
import trailerSvg from '../../resources/images/icon/trailer.svg';
import trainSvg from '../../resources/images/icon/train.svg';
import tramSvg from '../../resources/images/icon/tram.svg';
import truckSvg from '../../resources/images/icon/truck.svg';
import vanSvg from '../../resources/images/icon/van.svg';
import scorpioSvg from '../../resources/images/icon/Mahindra_Scorpio_Classic.svg';
import boleroSvg from '../../resources/images/icon/Mahindra_Bolero.svg';
import harrierSvg from '../../resources/images/icon/Tata_Harrier_SUV.svg';
import pulsarSvg from '../../resources/images/icon/Bajaj_Pulsar.svg';
import activaSvg from '../../resources/images/icon/Honda_Activa.svg';
import rickshawSvg from '../../resources/images/icon/Auto-Rickshaw.svg';
import busCitySvg from '../../resources/images/icon/Ashok_Leyland_City_Bus.svg';
import truckTataSvg from '../../resources/images/icon/Tata_407_Truck.svg';
import scorpio3d from '../../resources/images/icon/scorpio_3d.png';
import harrier3d from '../../resources/images/icon/harrier_3d.png';
import truck3d from '../../resources/images/icon/truck_3d.png';
import bus3d from '../../resources/images/icon/bus_3d.png';
import rickshaw3d from '../../resources/images/icon/rickshaw_3d.png';

export const mapIcons = {
  animal: animalSvg,
  bicycle: bicycleSvg,
  boat: boatSvg,
  bus: busSvg,
  car: carSvg,
  camper: camperSvg,
  crane: craneSvg,
  default: defaultSvg,
  finish: finishSvg,
  helicopter: helicopterSvg,
  motorcycle: motorcycleSvg,
  person: personSvg,
  plane: planeSvg,
  scooter: scooterSvg,
  ship: shipSvg,
  start: startSvg,
  tractor: tractorSvg,
  trailer: trailerSvg,
  train: trainSvg,
  tram: tramSvg,
  truck: truckSvg,
  van: vanSvg,
  scorpio: scorpio3d,
  bolero: boleroSvg,
  harrier: harrier3d,
  pulsar: pulsarSvg,
  activa: activaSvg,
  rickshaw: rickshaw3d,
  busCity: bus3d,
  truckTata: truck3d,
};

export const mapIconKey = (category) => {
  switch (category) {
    case 'offroad':
    case 'pickup':
      return 'pickup';
    case 'suv':
      return 'suv';
    case 'motorcycle':
    case 'bike':
      return 'motorcycle';
    case 'scooter':
      return 'scooter';
    case 'trolleybus':
    case 'bus':
      return 'bus';
    case 'truck':
    case 'lorry':
      return 'truck';
    default:
      return mapIcons.hasOwnProperty(category) ? category : 'default';
  }
};

export const mapImages = {};

const theme = createTheme({
  palette: {
    neutral: { main: grey[500] },
    info: { main: '#3b82f6' },
    success: { main: '#10b981' },
    error: { main: '#ef4444' },
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
        const skipTint = ['scorpio', 'harrier', 'rickshaw', 'busCity', 'truckTata'].includes(
          category,
        );
        results.push(
          loadImage(mapIcons[category]).then((icon) => {
            mapImages[`${category}-${color}`] = prepareIcon(
              background,
              icon,
              theme.palette[color].main,
              skipTint,
            );
          }),
        );
      });
      await Promise.all(results);
    }),
  );
};
