import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { motionActions } from '../store';
import { useAttributePreference } from '../common/util/preferences';
import { useEffectAsync } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { checkMaintenanceStatus } from '../common/util/maintenanceCheck';
import { errorsActions } from '../store';

const buildSegments = (events, fromTimestamp, toTimestamp) => {
  const segments = [];
  let cursor = fromTimestamp;
  const firstEvent = events.length ? events[0] : null;
  let state = 'stopped';
  if (firstEvent && firstEvent.type === 'deviceStopped') {
    state = 'moving';
  }

  events.forEach((event) => {
    const timestamp = dayjs(event.eventTime).valueOf();
    const clampedTimestamp = Math.max(fromTimestamp, Math.min(toTimestamp, timestamp));
    if (clampedTimestamp > cursor) {
      segments.push({
        type: state,
        value: clampedTimestamp - cursor,
      });
    }
    state = event.type === 'deviceMoving' ? 'moving' : 'stopped';
    cursor = clampedTimestamp;
  });

  if (toTimestamp > cursor) {
    segments.push({
      type: state,
      value: toTimestamp - cursor,
    });
  }

  if (!segments.length) {
    return [{ type: 'stopped', value: 1 }];
  }

  return segments;
};

const MotionController = () => {
  const dispatch = useDispatch();
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);

  const deviceSecondary = useAttributePreference('deviceSecondary', '');

  useEffectAsync(async () => {
    if (deviceSecondary !== 'motion') {
      dispatch(motionActions.clear());
      return;
    }

    let active = true;

    const refreshMotion = async () => {
      const to = dayjs();
      const from = to.subtract(24, 'hour');
      const query = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      query.append('type', 'deviceMoving');
      query.append('type', 'deviceStopped');

      const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const events = await response.json();

      const groupedEvents = {};
      events.forEach((event) => {
        if (!groupedEvents[event.deviceId]) {
          groupedEvents[event.deviceId] = [];
        }
        groupedEvents[event.deviceId].push(event);
      });
      const nextMotion = Object.fromEntries(
        Object.entries(groupedEvents).map(([deviceId, deviceEvents]) => [
          deviceId,
          buildSegments(deviceEvents, from.valueOf(), to.valueOf()),
        ]),
      );

      // Perform AI Maintenance Checks
      Object.values(devices).forEach((device) => {
          const position = positions[device.id];
          if (position) {
              const status = checkMaintenanceStatus(device, position);
              if (status.overdue) {
                  dispatch(errorsActions.push(status.reason));
              }
          }
      });

      if (active) {
        dispatch(motionActions.set(nextMotion));
      }
    };

    await refreshMotion();
    const interval = setInterval(refreshMotion, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [deviceSecondary]);

  return null;
};

export default MotionController;
