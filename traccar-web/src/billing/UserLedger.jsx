import React, { useState } from 'react';
import { 
  Box, Typography, Button, TextField, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, 
  Tooltip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, InputAdornment 
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Refresh as RefreshIcon, 
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Login as ImpersonateIcon,
  Block as SuspendIcon,
  CheckCircle as ResetIcon,
  Edit as EditIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { exportToCsv } from '../common/util/export';

const UserLedger = ({ users, loading, onRefresh, onImpersonate, onUpdateStatus, onSyncDevices, onOpenLedger }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExport = () => {
    const headers = ["Name", "Email", "Role", "Status", "Devices", "Expires At"];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.role,
      u.isActive ? "Active" : "Suspended",
      u.subDetails?.deviceCount || 0,
      u.subDetails?.expiresAt ? new Date(u.subDetails.expiresAt).toLocaleDateString() : 'N/A'
    ]);
    exportToCsv("user_ledger", rows, headers);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
          User Ledger <span style={{ opacity: 0.5, fontSize: '0.9rem', fontWeight: 400 }}>({filteredUsers.length} total)</span>
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
                placeholder="Search users..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                        </InputAdornment>
                    ),
                    sx: { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }
                }}
            />
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
                Export CSV
            </Button>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRefresh} disabled={loading}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Refresh'}
            </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Client</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Subscription</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Operations</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{u.name}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>{u.email}</Typography>
                  </TableCell>
                  <TableCell>
                    {u.subDetails ? (
                      <Chip 
                        label={`${u.subDetails.deviceCount} Devices`} 
                        size="small" 
                        sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }}
                      />
                    ) : 'No Plan'}
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.5 }}>
                        Expires: {u.subDetails?.expiresAt ? new Date(u.subDetails.expiresAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={u.isActive ? "ACTIVE" : "SUSPENDED"} 
                      color={u.isActive ? "success" : "error"}
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Detailed Account Ledger">
                        <IconButton onClick={() => onOpenLedger(u)} sx={{ color: '#3b82f6' }}><ViewIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title="Sync Devices from Traccar">
                        <IconButton onClick={() => onSyncDevices(u)} sx={{ color: '#60a5fa' }}><SyncIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title="Impersonate (Ghost Mode)">
                        <IconButton onClick={() => onImpersonate(u)} sx={{ color: '#fbbf24' }}><ImpersonateIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title={u.isActive ? "Suspend Account" : "Activate Account"}>
                        <IconButton onClick={() => onUpdateStatus(u)} sx={{ color: u.isActive ? '#f87171' : '#34d399' }}><SuspendIcon /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default UserLedger;
