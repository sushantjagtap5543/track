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

export const fetchDevices = createAsyncThunk(
  'devices/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/devices', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // FIX: always return an array even if API returns null/undefined
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const addDevice = createAsyncThunk(
  'devices/add',
  async (device, { rejectWithValue }) => {
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
  }
);

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
  }
);

export const removeDevice = createAsyncThunk(
  'devices/remove',
  async (id, { rejectWithValue }) => {
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
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const devicesSlice = createSlice({
  name: 'devices',
  // ✅ FIX: Every field explicitly initialized — no undefined arrays
  initialState: {
    items: [],           // was: undefined  ← THIS caused the crash
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
    // FIX: WebSocket / SSE real-time update handler — guards against bad data
    updateDeviceStatus(state, action) {
      const update = action.payload;
      if (!update || typeof update.id === 'undefined') return; // guard
      const index = state.items.findIndex((d) => d.id === update.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...update };
      }
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
        // ✅ FIX: guarantee items is always an array before any .push() happens
        const payload = action.payload;
        state.items = Array.isArray(payload) ? payload : [];
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch devices';
        state.items = state.items ?? []; // ensure array even on error
      })

      // addDevice
      .addCase(addDevice.fulfilled, (state, action) => {
        if (!action.payload || typeof action.payload.id === 'undefined') return;
        // ✅ FIX: ensure items is array before push (defensive)
        if (!Array.isArray(state.items)) state.items = [];
        state.items.push(action.payload);
      })

      // updateDevice
      .addCase(updateDevice.fulfilled, (state, action) => {
        if (!action.payload) return;
        if (!Array.isArray(state.items)) state.items = [];
        const index = state.items.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      // removeDevice
      .addCase(removeDevice.fulfilled, (state, action) => {
        if (!Array.isArray(state.items)) { state.items = []; return; }
        state.items = state.items.filter((d) => d.id !== action.payload);
        if (state.selectedId === action.payload) state.selectedId = null;
      });
  },
});

export const { selectDevice, clearError, updateDeviceStatus } = devicesSlice.actions;
export default devicesSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────
// FIX: all selectors default to [] / null to prevent undefined in components

export const selectAllDevices = (state) => state.devices?.items ?? [];
export const selectSelectedDeviceId = (state) => state.devices?.selectedId ?? null;
export const selectDevicesLoading = (state) => state.devices?.loading ?? false;
export const selectDevicesError = (state) => state.devices?.error ?? null;
export const selectSelectedDevice = (state) => {
  const items = state.devices?.items ?? [];
  const id = state.devices?.selectedId;
  return id != null ? items.find((d) => d.id === id) ?? null : null;
};
