import { useId, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { map } from './core/MapView';
import { useAttributePreference } from '../common/util/preferences';
import { findFonts } from './core/mapUtil';

const MapMarkers = ({ markers, showTitles }) => {
  const id = useId();

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // ✅ PERFECT ZOOM (S201): Dynamic icon scaling based on zoom level.
    // Icons become smaller when zoomed out (zoom 5) and larger when zoomed in (zoom 18).
    const zoomIconScale = [
      'interpolate', ['linear'], ['zoom'],
      5, 0.4 * iconScale,
      10, 0.7 * iconScale,
      15, 1.2 * iconScale,
      20, 1.8 * iconScale
    ];

    if (showTitles) {
      map.addLayer({
        id,
        type: 'symbol',
        source: id,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': '{image}',
          'icon-size': zoomIconScale,
          'icon-allow-overlap': true,
          'text-field': '{title}',
          'text-allow-overlap': true,
          'text-anchor': 'top',
          'text-offset': [0, 0.8 * iconScale],
          'text-font': findFonts(map),
          'text-size': 12,
        },
        paint: {
          'text-halo-color': 'white',
          'text-halo-width': 1,
        },
      });
    } else {
      map.addLayer({
        id,
        type: 'symbol',
        source: id,
        layout: {
          'icon-image': '{image}',
          'icon-size': zoomIconScale,
          'icon-allow-overlap': true,
        },
      });
    }

    return () => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [showTitles]);

  useEffect(() => {
    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: markers.map(({ latitude, longitude, image, title }) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        properties: {
          image: image || 'default-neutral',
          title: title || '',
        },
      })),
    });
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [showTitles, markers]);

  return null;
};

export default MapMarkers;
