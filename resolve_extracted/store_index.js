// saas/src/store/index.js  — FIXED
//
// FIX: Ensures all reducers are registered so no slice is ever `undefined`
//      when accessed via useSelector. Missing reducer registration = undefined
//      state slice = same push() crash in a different slice.

import { configureStore } from '@reduxjs/toolkit';
import devicesReducer from './devicesSlice';
import positionsReducer from './positionsSlice';
import sessionReducer from './sessionSlice';
import geofencesReducer from './geofencesSlice';
import eventsReducer from './eventsSlice';
import notificationsReducer from './notificationsSlice';

const store = configureStore({
  reducer: {
    devices: devicesReducer,
    positions: positionsReducer,
    session: sessionReducer,
    geofences: geofencesReducer,
    events: eventsReducer,
    notifications: notificationsReducer,
  },
  // FIX: allow non-serializable values in specific paths (e.g. Date objects)
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['events.items', 'positions.items'],
      },
    }),
});

export default store;
