import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { geofencesActions } from '../../store';
import fetchOrThrow from './fetchOrThrow';
import { useCatchCallback } from '../../reactHelper';

export const useSafeParking = (device, position) => {
  const dispatch = useDispatch();
  
  const parkingGeofence = useSelector((state) =>
    Object.values(state.geofences.items).find((it) => it.name === `Safe Parking - ${device?.name}`),
  );

  const toggleSafeParking = useCatchCallback(async () => {
    if (!device || !position) return;

    if (parkingGeofence) {
      await fetchOrThrow(`/api/geofences/${parkingGeofence.id}`, { method: 'DELETE' });
      dispatch(geofencesActions.remove(parkingGeofence.id));
    } else {
      const newItem = {
        name: `Safe Parking - ${device.name}`,
        area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
        attributes: { color: '#06b6d4' },
      };
      const response = await fetchOrThrow('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      const item = await response.json();
      await fetchOrThrow('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
      });
      dispatch(geofencesActions.update([item]));
    }
  }, [dispatch, device, position, parkingGeofence]);

  return { isSafeParkingActive: !!parkingGeofence, toggleSafeParking };
};
