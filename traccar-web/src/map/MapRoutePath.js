import { useTheme } from '@mui/material/styles';
import { useId, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { useAttributePreference } from '../common/util/preferences';

const MapRoutePath = ({ positions }) => {
  const id = useId();
  const theme = useTheme();

  const reportColor = useSelector((state) => {
    const position = positions?.find(() => true);
    if (position) {
      const attributes = state.devices.items[position.deviceId]?.attributes;
      if (attributes) {
        return attributes['web.reportColor'] || null;
      }
    }
    return null;
  });

  const mapLineWidth = useAttributePreference('mapLineWidth', 3);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 0.8);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: `${id}-line`,
      type: 'line',
      source: id,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    });

    map.addLayer({
      id: `${id}-arrows`,
      type: 'symbol',
      source: id,
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'icon-image': 'direction',
        'icon-size': 0.6,
        'icon-allow-overlap': true,
        'icon-rotate': ['get', 'rotation'],
        'icon-rotation-alignment': 'map',
      },
      paint: {
        'icon-opacity': 0.9,
      },
    });

    return () => {
      [`${id}-line`, `${id}-arrows`].forEach(l => map.getLayer(l) && map.removeLayer(l));
      map.getSource(id) && map.removeSource(id);
    };
  }, [id]);

  useEffect(() => {
    if (!positions || positions.length < 2) return;

    const minSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.min(a, b), Infinity);
    const maxSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.max(a, b), -Infinity);

    const features = [];
    
    // 1. Line segments for speed colors
    for (let i = 0; i < positions.length - 1; i += 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [positions[i].longitude, positions[i].latitude],
            [positions[i + 1].longitude, positions[i + 1].latitude],
          ],
        },
        properties: {
          color: reportColor || getSpeedColor(positions[i + 1].speed, minSpeed, maxSpeed),
          width: mapLineWidth,
          opacity: mapLineOpacity,
        },
      });
    }

    // 2. Sample points for direction arrows (every 10th point or if major turn)
    const arrowFrequency = Math.max(1, Math.floor(positions.length / 50)); // aim for ~50 arrows max for performance
    for (let i = 0; i < positions.length; i += arrowFrequency) {
      if (positions[i].course !== undefined) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [positions[i].longitude, positions[i].latitude],
          },
          properties: {
            rotation: positions[i].course,
          },
        });
      }
    }

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [theme, positions, reportColor, mapLineWidth, mapLineOpacity, id]);

  return null;
};

export default MapRoutePath;
