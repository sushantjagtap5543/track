// saas/src/store/devicesSlice.js  — FIXED
//
// BUG: initialState had `items: undefined` (or missing), causing:
//   TypeError: Cannot read properties of undefined (reading 'push')
//   at s1 → Immer draft .push() on undefined array
//
// FIX: All array and object fields explicitly initialized.
//      All reducers guard against null/undefined API responses.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ── Async thunks ─────────────────────────────────────────────────────────────

export const fetchDevices = createAsyncThunk('devices/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/devices', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // FIX: always return an array even if API returns null/undefined
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const addDevice = createAsyncThunk('devices/add', async (device, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/devices', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateDevice = createAsyncThunk(
  'devices/update',
  async ({ id, ...device }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...device }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const removeDevice = createAsyncThunk('devices/remove', async (id, { rejectWithValue }) => {
  try {
    const res = await fetch(`/api/devices/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const devicesSlice = createSlice({
  name: 'devices',
  // ✅ FIX: Every field explicitly initialized — no undefined arrays
  initialState: {
    items: {}, // keyed by id for compatibility and performance
    selectedId: null,
    loading: false,
    error: null,
  },
  reducers: {
    selectDevice(state, action) {
      state.selectedId = action.payload ?? null;
    },
    clearError(state) {
      state.error = null;
    },
    // WebSocket / SSE real-time update handler — guards against bad data
    updateDeviceStatus(state, action) {
      const update = action.payload;
      if (!update || typeof update.id === 'undefined') return;
      if (!state.items) state.items = {};
      state.items[update.id] = { ...(state.items[update.id] || {}), ...update };
    },
    // COMPATIBILITY FIX: Add refresh and update actions used in SocketController
    refresh(state, action) {
      state.items = {};
      const devices = action.payload;
      if (Array.isArray(devices)) {
        devices.forEach((d) => {
          state.items[d.id] = d;
        });
      }
    },
    update(state, action) {
      const updates = action.payload;
      if (!Array.isArray(updates)) return;
      if (!state.items) state.items = {};
      updates.forEach((update) => {
        state.items[update.id] = { ...(state.items[update.id] || {}), ...update };
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDevices
      .addCase(fetchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        if (Array.isArray(action.payload)) {
          action.payload.forEach((d) => {
            state.items[d.id] = d;
          });
        }
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch devices';
        if (!state.items) state.items = {};
      })

      // addDevice
      .addCase(addDevice.fulfilled, (state, action) => {
        if (!action.payload || typeof action.payload.id === 'undefined') return;
        if (!state.items) state.items = {};
        state.items[action.payload.id] = action.payload;
      })

      // updateDevice
      .addCase(updateDevice.fulfilled, (state, action) => {
        if (!action.payload || typeof action.payload.id === 'undefined') return;
        if (!state.items) state.items = {};
        state.items[action.payload.id] = action.payload;
      })

      // removeDevice
      .addCase(removeDevice.fulfilled, (state, action) => {
        if (!state.items) return;
        delete state.items[action.payload];
        if (state.selectedId === action.payload) state.selectedId = null;
      });
  },
});

export const devicesActions = devicesSlice.actions;
export const devicesReducer = devicesSlice.reducer;
export default devicesSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────
// FIX: all selectors default to [] / null to prevent undefined in components

export const selectAllDevices = (state) => Object.values(state.devices?.items ?? {});
export const selectSelectedDeviceId = (state) => state.devices?.selectedId ?? null;
export const selectDevicesLoading = (state) => state.devices?.loading ?? false;
export const selectDevicesError = (state) => state.devices?.error ?? null;
export const selectSelectedDevice = (state) => {
  const items = state.devices?.items ?? {};
  const id = state.devices?.selectedId;
  return id != null ? (items[id] ?? null) : null;
};
