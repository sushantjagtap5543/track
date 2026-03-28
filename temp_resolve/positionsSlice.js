// saas/src/store/positionsSlice.js  — FIXED
//
// BUG: Same pattern as devicesSlice — positions array undefined in initialState.
//      The Array.map in the error stack iterates API positions then pushes each
//      into state.items — which was undefined → crash.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchPositions = createAsyncThunk(
  'positions/fetchAll',
  async (deviceIds, { rejectWithValue }) => {
    try {
      const params = Array.isArray(deviceIds) && deviceIds.length
        ? '?' + deviceIds.map((id) => `deviceId=${id}`).join('&')
        : '';
      const res = await fetch(`/api/positions${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const positionsSlice = createSlice({
  name: 'positions',
  // ✅ FIX: items initialized as [] not undefined
  initialState: {
    items: [],      // was missing/undefined — caused the push() crash
    loading: false,
    error: null,
  },
  reducers: {
    // FIX: real-time position update from WebSocket
    updatePosition(state, action) {
      const pos = action.payload;
      if (!pos || typeof pos.deviceId === 'undefined') return;
      if (!Array.isArray(state.items)) state.items = [];
      const index = state.items.findIndex((p) => p.deviceId === pos.deviceId);
      if (index !== -1) {
        state.items[index] = pos;
      } else {
        state.items.push(pos);
      }
    },
    clearPositions(state) {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPositions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPositions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch positions';
        if (!Array.isArray(state.items)) state.items = [];
      });
  },
});

export const { updatePosition, clearPositions } = positionsSlice.actions;
export default positionsSlice.reducer;

// Selectors
export const selectAllPositions = (state) => state.positions?.items ?? [];
export const selectPositionByDeviceId = (deviceId) => (state) =>
  (state.positions?.items ?? []).find((p) => p.deviceId === deviceId) ?? null;
