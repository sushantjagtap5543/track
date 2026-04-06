import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Snackbar, SnackbarContent } from '@mui/material';
import { devicesActions, sessionActions } from './store';
import { useCatchCallback, useEffectAsync } from './reactHelper';
import { snackBarDurationLongMs } from './common/util/duration';
import alarm from './resources/alarm.mp3';
import { eventsActions } from './store/events';
import useFeatures from './common/util/useFeatures';
import { useAttributePreference } from './common/util/preferences';
import {
  handleNativeNotificationListeners,
  nativePostMessage,
} from './common/components/NativeInterface';
import fetchOrThrow from './common/util/fetchOrThrow';
import { useTranslation } from './common/components/LocalizationProvider';
import { prefixString } from './common/util/stringUtils';

const logoutCode = 4000;

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const SocketController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const authenticated = useSelector((state) => Boolean(state.session.user));
  const includeLogs = useSelector((state) => state.session.includeLogs);
  const devices = useSelector((state) => state.devices.items);

  const socketRef = useRef();
  const reconnectTimeoutRef = useRef();

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const [notifications, setNotifications] = useState([]);

  const soundEvents = useAttributePreference('soundEvents', '');
  const soundAlarms = useAttributePreference('soundAlarms', 'sos');

  const features = useFeatures();

  const lastSoundTime = useRef(0);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleEvents = useCallback(
    (events) => {
      if (!features.disableEvents) {
        dispatch(eventsActions.add(events));
      }

      const now = Date.now();
      const isCritical = events.some(
        (e) =>
          (e.type === 'alarm' &&
            [
              'sos',
              'theft',
              'vibration',
              'overspeed',
              'fallDown',
              'lowPower',
              'lowBattery',
              'jamming',
              'fatigueDriving',
              'powerCut',
              'tampering',
              'removing',
              'accident',
            ].includes(e.attributes.alarm)) ||
          ['geofenceEnter', 'geofenceExit', 'deviceOverspeed', 'maintenance'].includes(e.type) ||
          ['ignitionOn', 'ignitionOff'].includes(e.type),
      );

      if (
        isCritical ||
        events.some(
          (e) =>
            soundEvents.includes(e.type) ||
            (e.type === 'alarm' && soundAlarms.includes(e.attributes.alarm)),
        )
      ) {
        if (now - lastSoundTime.current > 1000) {
          new Audio(alarm).play().catch(() => {});
          lastSoundTime.current = now;
        }
      }

      const criticalAlarm = events.find(
        (e) =>
          e.type === 'alarm' &&
          ['sos', 'theft', 'accident', 'jamming', 'powerCut'].includes(e.attributes.alarm),
      );
      if (criticalAlarm) {
        speak(
          `CRITICAL ALERT: ${criticalAlarm.attributes.alarm.toUpperCase()} detected on ${devices[criticalAlarm.deviceId]?.name || 'unknown vehicle'}`,
        );
      }

      setNotifications(
        events.map((event) => ({
          id: event.id,
          message: event.attributes.message || t(prefixString('event', event.type)),
          show: true,
        })),
      );
    },
    [features, dispatch, soundEvents, soundAlarms, devices, t],
  );

  useEffect(() => {
    let simulationInterval = null;
    window.startLiveFleetSimulation = () => {
      console.log('--- STARTING LIVE FLEET SIMULATION ---');
      const deviceIds = Object.keys(devices).length > 0 ? Object.keys(devices) : [1];
      let step = 0;

      simulationInterval = setInterval(() => {
        step++;
        const positions = deviceIds.map((id, index) => ({
          id: index + '-' + step,
          deviceId: parseInt(id),
          protocol: 'osmand',
          serverTime: new Date().toISOString(),
          deviceTime: new Date().toISOString(),
          fixTime: new Date().toISOString(),
          outdated: false,
          valid: true,
          latitude: 18.5204 + step * 0.001 + index * 0.01,
          longitude: 73.8567 + step * 0.001 + index * 0.01,
          altitude: 500,
          speed: 40 + Math.random() * 60,
          course: (step * 10) % 360,
          address: 'Simulated Moving Street',
          accuracy: 0,
          network: null,
          attributes: { ignition: true, distance: 100, totalDistance: 1000 + step * 100 },
        }));

        dispatch(sessionActions.updatePositions(positions));

        if (step % 5 === 0) {
          handleEvents([
            {
              id: `sim-event-${Date.now()}`,
              type: 'deviceOverspeed',
              deviceId: deviceIds[0],
              attributes: { message: 'SIMULATED LIVE: Overspeeding detected!' },
            },
          ]);
        }
      }, 2000);
    };

    window.stopLiveFleetSimulation = () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
        console.log('--- LIVE FLEET SIMULATION STOPPED ---');
      }
    };

    window.simulateGeoSurePathAlarms = () => {
      const scenarios = [
        { type: 'alarm', alarm: 'sos', msg: 'SOS EMERGENCY BUTTON PRESSED!' },
        { type: 'alarm', alarm: 'theft', msg: 'THEFT ATTEMPT DETECTED!' },
        { type: 'alarm', alarm: 'jamming', msg: 'GSM/GPS JAMMING SIGNAL DETECTED!' },
        { type: 'deviceOverspeed', msg: 'OVERSPEEDING: UNIT EXCEEDED 80KM/H' },
        { type: 'ignitionOn', msg: 'IGNITION TURNED ON' },
        { type: 'geofenceEnter', msg: 'VEHICLE ENTERED RESTRICTED ZONE' },
        { type: 'alarm', alarm: 'vibration', msg: 'VIBRATION / TAMPER ALERT' },
        { type: 'alarm', alarm: 'powerCut', msg: 'MAIN POWER SUPPLY DISCONNECTED!' },
        { type: 'alarm', alarm: 'fatigueDriving', msg: 'DRIVER FATIGUE DETECTED' },
        { type: 'alarm', alarm: 'hardBraking', msg: 'SUDDEN BRAKING EVENT' },
        { type: 'alarm', alarm: 'tow', msg: 'UNAUTHORIZED TOWING DETECTED!' },
        { type: 'maintenance', msg: 'SCHEDULED ENGINE MAINTENANCE DUE' },
      ];
      console.log('--- STARTING 20+ SCENARIO AI CHECK ---');
      scenarios.forEach((s, i) => {
        setTimeout(() => {
          handleEvents([
            {
              id: `sim-${Date.now()}-${i}`,
              type: s.type,
              deviceId: Object.keys(devices)[0] || 1,
              attributes: { alarm: s.alarm, message: s.msg },
            },
          ]);
          console.log(`Simulated ${i + 1}/${scenarios.length}: ${s.msg}`);
        }, i * 3500);
      });
    };
  }, [handleEvents, devices, dispatch]);

  const connectSocket = () => {
    clearReconnectTimeout();
    if (socketRef.current) {
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        return;
      }
      socketRef.current.close();
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
    socketRef.current = socket;

    socket.onopen = () => {
      dispatch(sessionActions.updateSocket(true));
    };

    socket.onclose = async (event) => {
      dispatch(sessionActions.updateSocket(false));
      if (event.code !== logoutCode) {
        try {
          const devicesResponse = await fetch('/api/devices');
          if (devicesResponse.ok) {
            dispatch(devicesActions.update(await devicesResponse.json()));
          }
          const positionsResponse = await fetch('/api/positions');
          if (positionsResponse.ok) {
            dispatch(sessionActions.updatePositions(await positionsResponse.json()));
          }
          if (devicesResponse.status === 401 || positionsResponse.status === 401) {
            navigate('/login');
          }
        } catch {
          // ignore errors
        }
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectSocket();
        }, 2000);
      }
    };

    const buffer = { devices: [], positions: [], events: [], logs: [] };
    let flushTimeout = null;

    const flush = () => {
      if (buffer.devices.length) dispatch(devicesActions.update(buffer.devices));
      if (buffer.positions.length) {
        dispatch(sessionActions.updatePositions(buffer.positions));

        // Persist for Safe Parking Lock
        const lastPositions = JSON.parse(localStorage.getItem('last_positions') || '{}');
        buffer.positions.forEach((p) => {
          lastPositions[p.deviceId] = p;
        });
        localStorage.setItem('last_positions', JSON.stringify(lastPositions));

        // Proactive Safe Parking Check
        buffer.positions.forEach((p) => {
          const device = devices[p.deviceId];
          if (device?.attributes?.safeParkingEnabled && device?.attributes?.safeParkingLat) {
            const dist = getDistance(
              p.latitude,
              p.longitude,
              device.attributes.safeParkingLat,
              device.attributes.safeParkingLon,
            );
            if (dist > (device.attributes.safeParkingRadius || 50)) {
              // 50m default
              handleEvents([
                {
                  id: `safe-parking-${p.id}`,
                  type: 'alarm',
                  deviceId: p.deviceId,
                  attributes: {
                    alarm: 'theft',
                    message: `SAFE PARKING BREACH: ${device.name} has moved ${Math.round(dist)} meters from locked position!`,
                  },
                },
              ]);
            }
          }
        });
      }
      if (buffer.events.length) handleEvents(buffer.events);
      if (buffer.logs.length) dispatch(sessionActions.updateLogs(buffer.logs));
      buffer.devices = [];
      buffer.positions = [];
      buffer.events = [];
      buffer.logs = [];
      flushTimeout = null;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.devices) buffer.devices.push(...data.devices);
        if (data.positions) buffer.positions.push(...data.positions);
        if (data.events) buffer.events.push(...data.events);
        if (data.logs) buffer.logs.push(...data.logs);

        if (!flushTimeout) {
          flushTimeout = setTimeout(flush, 250);
        }
      } catch (e) {
        // ignore errors
      }
    };
  };

  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ logs: includeLogs }));
    }
  }, [includeLogs]);

  useEffectAsync(async () => {
    if (authenticated) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
      nativePostMessage('authenticated');
      connectSocket();
      return () => {
        clearReconnectTimeout();
        socketRef.current?.close(logoutCode);
      };
    }
    return null;
  }, [authenticated]);

  const handleNativeNotification = useCatchCallback(
    async (message) => {
      const eventId = message.data.eventId;
      if (eventId) {
        const response = await fetch(`/api/events/${eventId}`);
        if (response.ok) {
          const event = await response.json();
          const eventWithMessage = {
            ...event,
            attributes: { ...event.attributes, message: message.notification.body },
          };
          handleEvents([eventWithMessage]);
        }
      }
    },
    [handleEvents],
  );

  useEffect(() => {
    handleNativeNotificationListeners.add(handleNativeNotification);
    return () => handleNativeNotificationListeners.delete(handleNativeNotification);
  }, [handleNativeNotification]);

  useEffect(() => {
    if (!authenticated) return;
    const reconnectIfNeeded = () => {
      const socket = socketRef.current;
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        connectSocket();
      } else if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send('{}');
        } catch {
          // test connection
        }
      }
    };
    const onVisibility = () => {
      if (!document.hidden) {
        reconnectIfNeeded();
      }
    };
    window.addEventListener('online', reconnectIfNeeded);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', reconnectIfNeeded);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authenticated]);

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.show}
          autoHideDuration={snackBarDurationLongMs}
          onClose={() => setNotifications(notifications.filter((e) => e.id !== notification.id))}
        >
          <SnackbarContent
            message={notification.message}
            sx={{
              backgroundColor: 'background.paper',
              color: 'text.primary',
              border: 1,
              borderColor: 'divider',
            }}
          />
        </Snackbar>
      ))}
    </>
  );
};

export default connect()(SocketController);
