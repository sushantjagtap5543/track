import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import { sessionActions, devicesActions, positionsActions } from './store';
import { useCatchCallback, useEffectAsync } from './reactHelper';
import alarm from './resources/alarm.mp3';
import { playEventSound, playLegacyAlarm } from './resources/sounds/SoundGenerator';
import { eventsActions } from './store/events';
import useFeatures from './common/util/useFeatures';
import { useAttributePreference } from './common/util/preferences';
import {
  handleNativeNotificationListeners,
  nativePostMessage,
} from './common/components/NativeInterface';
import fetchOrThrow from './common/util/fetchOrThrow';

const logoutCode = 4000;

const SocketController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const authenticated = useSelector((state) => Boolean(state.session.user));
  const includeLogs = useSelector((state) => state.session.includeLogs);

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

  const handleEvents = useCallback(
    (events) => {
      if (!features.disableEvents) {
        dispatch(eventsActions.add(events));
      }

      const shouldPlaySound = events.some(
        (e) =>
          soundEvents.includes(e.type) ||
          (e.type === 'alarm' && soundAlarms.includes(e.attributes.alarm)) ||
          // Smart Overlay: Always sound for critical status changes if prefs are default
          (!soundEvents &&
            !soundAlarms &&
            ['deviceOnline', 'deviceOffline', 'alarm', 'ignitionOn', 'ignitionOff'].includes(
              e.type,
            )) ||
          // SECURITY FIX: Always sound alarm for Safe Parking breach regardless of system settings
          (e.type === 'geofenceExit' && e.attributes.name?.startsWith('Safe Parking')),
      );

      if (shouldPlaySound) {
        const relevantEvent = events.find(
          (e) =>
            soundEvents.includes(e.type) ||
            (e.type === 'alarm' && soundAlarms.includes(e.attributes.alarm)) ||
            (!soundEvents &&
              !soundAlarms &&
              ['deviceOnline', 'deviceOffline', 'alarm', 'ignitionOn', 'ignitionOff'].includes(
                e.type,
              )) ||
            (e.type === 'geofenceExit' && e.attributes.name?.startsWith('Safe Parking')),
        );
        try {
          playEventSound(relevantEvent);
        } catch {
          playLegacyAlarm(alarm);
        }
      }
      setNotifications((prev) => [
        ...prev,
        ...events.map((event) => {
          let message = event.attributes.message;
          let severity = 'info';
          let title = 'System Update';

          if (!message) {
            switch (event.type) {
              case 'deviceOnline':
                message = 'Vehicle is now online and transmitting.';
                severity = 'success';
                title = 'Online';
                break;
              case 'deviceOffline':
                message = 'Vehicle has lost connection.';
                severity = 'warning';
                title = 'Offline';
                break;
              case 'geofenceEnter':
                message = 'Vehicle entered a restricted zone.';
                severity = 'info';
                title = 'Geofence Enter';
                break;
              case 'geofenceExit':
                message = event.attributes.name?.startsWith('Safe Parking')
                  ? 'SECURITY ALERT: Safe Parking Shield Breached!'
                  : 'Vehicle exited a restricted zone.';
                severity = event.attributes.name?.startsWith('Safe Parking') ? 'error' : 'info';
                title = event.attributes.name?.startsWith('Safe Parking')
                  ? '🚨 SECURITY BREACH'
                  : 'Geofence Exit';
                break;
              case 'alarm':
                const alarmType = event.attributes.alarm;
                severity = 'error';
                title = '🚨 URGENT ALERT';
                switch (alarmType) {
                  case 'sos': message = 'EMERGENCY: SOS Button Pressed!'; break;
                  case 'overspeed': message = 'ALERT: Vehicle is exceeding speed limits.'; break;
                  case 'vibration': message = 'SECURITY: Unusual vibration detected.'; break;
                  case 'lowBattery': message = 'WARNING: Device battery is critically low.'; severity = 'warning'; title = 'Low Battery'; break;
                  case 'powerOff': message = 'CRITICAL: Main power supply disconnected.'; break;
                  case 'tow': message = 'SECURITY: Vehicle towing detected!'; break;
                  case 'jamming': message = 'SECURITY: Signal jamming detected!'; break;
                  case 'tampering': message = 'SECURITY: Device tampering detected!'; break;
                  case 'door': message = 'ALERT: Vehicle door opened.'; break;
                  case 'bonnet': message = 'ALERT: Bonnet opened.'; break;
                  case 'accident': message = 'CRITICAL: Possible accident detected!'; break;
                  case 'hardAcceleration': message = 'INFO: Harsh acceleration detected.'; severity = 'info'; title = 'Driving Behavior'; break;
                  case 'hardBraking': message = 'INFO: Harsh braking detected.'; severity = 'info'; title = 'Driving Behavior'; break;
                  case 'hardCornering': message = 'INFO: Harsh cornering detected.'; severity = 'info'; title = 'Driving Behavior'; break;
                  default: message = `ALARM: ${alarmType || 'Triggered'}`;
                }
                break;
              case 'ignitionOn':
                message = 'Engine has been started.';
                severity = 'success';
                title = 'Engine ON';
                break;
              case 'ignitionOff':
                message = 'Engine has been stopped.';
                severity = 'info';
                title = 'Engine OFF';
                break;
              case 'maintenance':
                message = 'Maintenance threshold reached.';
                severity = 'warning';
                title = 'Maintenance';
                break;
              case 'driverChanged':
                message = 'New driver identified.';
                severity = 'info';
                title = 'Driver Update';
                break;
              default:
                message = event.type.replace(/([A-Z])/g, ' $1').trim();
            }
          }
          return {
            id: event.id + Math.random(), // Ensure unique ID for multiple popups
            originalId: event.id,
            message: message,
            severity,
            title,
            duration: severity === 'error' || title.includes('SECURITY') ? 30000 : 5000,
            show: true,
          };
        }),
      ]);
    },
    [features, dispatch, soundEvents, soundAlarms],
  );

  const bufferRef = useRef({ devices: [], positions: [] });
  const flushBuffer = useCallback(() => {
    const { devices, positions } = bufferRef.current;
    if (devices.length > 0) {
      dispatch(devicesActions.update(devices));
      bufferRef.current.devices = [];
    }
    if (positions.length > 0) {
      dispatch(positionsActions.update(positions));
      bufferRef.current.positions = [];
    }
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(flushBuffer, 500);
    return () => clearInterval(interval);
  }, [flushBuffer]);

  const connectSocket = useCallback(() => {
    clearReconnectTimeout();
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
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
            dispatch(positionsActions.update(await positionsResponse.json()));
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
        }, 5000);
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.devices) {
        bufferRef.current.devices.push(...data.devices);
      }
      if (data.positions) {
        bufferRef.current.positions.push(...data.positions);
      }
      if (data.events) {
        handleEvents(data.events);
      }
      if (data.logs) {
        dispatch(sessionActions.updateLogs(data.logs));
      }
    };
  }, [dispatch, navigate, handleEvents]);

  useEffect(() => {
    socketRef.current?.send(JSON.stringify({ logs: includeLogs }));
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
  }, [authenticated, connectSocket, dispatch]);

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
    const intervalId = setInterval(reconnectIfNeeded, 30000);
    window.addEventListener('online', reconnectIfNeeded);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', reconnectIfNeeded);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authenticated, connectSocket]);

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.show}
          autoHideDuration={notification.duration}
          onClose={() => setNotifications((prev) => prev.filter((e) => e.id !== notification.id))}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%', boxShadow: 6 }}
          >
            <AlertTitle>{notification.title}</AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default connect()(SocketController);
