import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useEffect, useMemo } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { map } from '../core/MapView';
import { findFonts, geofenceToFeature, geometryToArea } from '../core/mapUtil';
import { errorsActions, geofencesActions } from '../../store';
import { useCatchCallback } from '../../reactHelper';
import drawTheme from './theme';
import { useTranslation } from '../../common/components/LocalizationProvider';
import fetchOrThrow from '../../common/util/fetchOrThrow';

MapboxDraw.constants.classes.CONTROL_BASE = 'maplibregl-ctrl';
MapboxDraw.constants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-';
MapboxDraw.constants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group';

/**
 * Patches MapLibre GL map instance for compatibility with @mapbox/mapbox-gl-draw.
 *
 * MapLibre GL v5 broke several APIs that mapbox-gl-draw depends on:
 * 1. addLayer() now requires explicit `source` for non-background layers
 * 2. touchZoomRotate was removed (replaced by touchGestures)
 *
 * This function applies temporary/persistent shims to make the draw plugin work.
 */
const patchMapForDraw = (mapInstance) => {
  // Shim: touchZoomRotate (removed in MapLibre v5, draw checks it in storeMapConfig)
  if (!mapInstance.touchZoomRotate) {
    mapInstance.touchZoomRotate = {
      isEnabled: () => false,
      enable: () => {},
      disable: () => {},
    };
  }
};

/**
 * Wraps map.addLayer during Draw's addControl lifecycle so that any layer
 * missing a `source` property automatically gets the COLD source assigned.
 * This is the minimal fix: hot features are rendered via source data updates
 * (setData) which work regardless of which source the layer points to,
 * because the HOT source data is always set after COLD in render.js.
 */
const addControlWithSourcePatch = (mapInstance, drawControl, position) => {
  const origAddLayer = mapInstance.addLayer.bind(mapInstance);
  mapInstance.addLayer = (layerSpec, before) => {
    if (layerSpec && !layerSpec.source && layerSpec.type !== 'background') {
      // Inject the cold source for draw layers that are missing one
      const patched = { ...layerSpec, source: 'mapbox-gl-draw-cold' };
      return origAddLayer(patched, before);
    }
    return origAddLayer(layerSpec, before);
  };
  try {
    mapInstance.addControl(drawControl, position);
  } finally {
    // Restore original addLayer
    mapInstance.addLayer = origAddLayer;
  }
};

const MapGeofenceEdit = ({ selectedGeofenceId }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const draw = useMemo(
    () =>
      new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          line_string: true,
          trash: true,
        },
        userProperties: true,
        styles: [
          ...drawTheme,
          {
            id: 'gl-draw-title',
            type: 'symbol',
            filter: ['all'],
            layout: {
              'text-field': '{user_name}',
              'text-font': findFonts(map),
              'text-size': 12,
            },
            paint: {
              'text-halo-color': 'white',
              'text-halo-width': 1,
            },
          },
        ],
      }),
    [],
  );

  const geofences = useSelector((state) => state.geofences.items);

  const refreshGeofences = useCatchCallback(async () => {
    const response = await fetchOrThrow('/api/geofences');
    dispatch(geofencesActions.refresh(await response.json()));
  }, [dispatch]);

  useEffect(() => {
    refreshGeofences();

    patchMapForDraw(map);
    const position = theme.direction === 'rtl' ? 'top-right' : 'top-left';
    addControlWithSourcePatch(map, draw, position);
    return () => map.removeControl(draw);
  }, [refreshGeofences]);

  useEffect(() => {
    const listener = async (event) => {
      const feature = event.features[0];
      const newItem = { name: t('sharedGeofence'), area: geometryToArea(feature.geometry) };
      draw.delete(feature.id);
      try {
        const response = await fetchOrThrow('/api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });
        const item = await response.json();
        navigate(`/settings/geofence/${item.id}`);
      } catch (error) {
        dispatch(errorsActions.push(error.message));
      }
    };

    map.on('draw.create', listener);
    return () => map.off('draw.create', listener);
  }, [dispatch, navigate]);

  useEffect(() => {
    const listener = async (event) => {
      const feature = event.features[0];
      try {
        await fetchOrThrow(`/api/geofences/${feature.id}`, { method: 'DELETE' });
        refreshGeofences();
      } catch (error) {
        dispatch(errorsActions.push(error.message));
      }
    };

    map.on('draw.delete', listener);
    return () => map.off('draw.delete', listener);
  }, [dispatch, refreshGeofences]);

  useEffect(() => {
    const listener = async (event) => {
      const feature = event.features[0];
      const item = Object.values(geofences).find((i) => i.id === feature.id);
      if (item) {
        const updatedItem = { ...item, area: geometryToArea(feature.geometry) };
        try {
          await fetchOrThrow(`/api/geofences/${feature.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem),
          });
          refreshGeofences();
        } catch (error) {
          dispatch(errorsActions.push(error.message));
        }
      }
    };

    map.on('draw.update', listener);
    return () => map.off('draw.update', listener);
  }, [dispatch, geofences, refreshGeofences]);

  useEffect(() => {
    draw.deleteAll();
    Object.values(geofences).forEach((geofence) => {
      draw.add(geofenceToFeature(theme, geofence));
    });
  }, [geofences]);

  useEffect(() => {
    if (selectedGeofenceId) {
      const feature = draw.get(selectedGeofenceId);
      let { coordinates } = feature.geometry;
      if (Array.isArray(coordinates[0][0])) {
        [coordinates] = coordinates;
      }
      const bounds = coordinates.reduce(
        (bounds, coordinate) => bounds.extend(coordinate),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[1]),
      );
      const canvas = map.getCanvas();
      map.fitBounds(bounds, { padding: Math.min(canvas.width, canvas.height) * 0.1 });
    }
  }, [selectedGeofenceId]);

  return null;
};

export default MapGeofenceEdit;
