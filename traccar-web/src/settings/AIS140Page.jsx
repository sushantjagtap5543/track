import React, { useState } from 'react';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem as MuiMenuItem,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import { useCatch, useEffectAsync } from '../reactHelper';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import TableShimmer from '../common/components/TableShimmer';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const AIS140Page = () => {
  const { classes } = useSettingsStyles();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());

  // Dialog State for Approval
  const [approvalDialog, setApprovalDialog] = useState(null); // stores vehicle object
  const [status, setStatus] = useState('PENDING');
  const [certNumber, setCertNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Dialog State for Forwarding
  const [forwardDialog, setForwardDialog] = useState(null); // stores vehicle object
  const [endpoint, setEndpoint] = useState('');
  const [forwardingEnabled, setForwardingEnabled] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await fetchOrThrow('/api/admin/ais140-inventory');
      const data = await response.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffectAsync(async () => {
    await loadItems();
  }, [timestamp]);

  const handleUpdateApproval = useCatch(async () => {
    await fetchOrThrow('/api/admin/ais140-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: approvalDialog.id,
        status,
        certNumber,
        expiryDate,
      }),
    });
    setApprovalDialog(null);
    setTimestamp(Date.now());
  });

  const handleUpdateForwarding = useCatch(async () => {
    await fetchOrThrow('/api/admin/ais140-forwarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: forwardDialog.id,
        endpoint,
        enabled: forwardingEnabled,
      }),
    });
    setForwardDialog(null);
    setTimestamp(Date.now());
  });

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Government / AIS 140']}>
      <Typography variant="h6" style={{ margin: '16px' }}>
        AIS 140 Government Compliance Inventory
      </Typography>
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>IMEI / Name</TableCell>
            <TableCell>Owner</TableCell>
            <TableCell>RTO Status</TableCell>
            <TableCell>Certificate</TableCell>
            <TableCell>Expiry</TableCell>
            <TableCell>Forwarding</TableCell>
            <TableCell className={classes.columnAction}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <b>{item.imei}</b> <br />
                {item.name}
              </TableCell>
              <TableCell>{item.user?.name}</TableCell>
              <TableCell>
                <div style={{ 
                  color: item.approvalStatus === 'APPROVED' ? 'green' : (item.approvalStatus === 'REJECTED' ? 'red' : 'orange'),
                  fontWeight: 'bold'
                }}>
                  {item.approvalStatus}
                </div>
              </TableCell>
              <TableCell>{item.certNumber || '-'}</TableCell>
              <TableCell>{item.ais140Expiry ? new Date(item.ais140Expiry).toLocaleDateString() : '-'}</TableCell>
              <TableCell>
                 {item.forwardingEnabled ? '✅ Active' : '❌ Disabled'} <br />
                 <small>{item.governmentEndpoint || 'No Endpoint'}</small>
              </TableCell>
              <TableCell className={classes.columnAction}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      setApprovalDialog(item);
                      setStatus(item.approvalStatus);
                      setCertNumber(item.certNumber || '');
                      setExpiryDate(item.ais140Expiry?.split('T')[0] || '');
                    }}
                  >
                    RTO
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SettingsInputComponentIcon />}
                    onClick={() => {
                      setForwardDialog(item);
                      setEndpoint(item.governmentEndpoint || '');
                      setForwardingEnabled(item.forwardingEnabled);
                    }}
                  >
                    Forward
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {loading && <TableShimmer columns={7} endAction />}
          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">No AIS 140 vehicles found in system.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* RTO Approval Dialog */}
      <Dialog open={!!approvalDialog} onClose={() => setApprovalDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>RTO Approval Lifecycle</DialogTitle>
        <DialogContent>
          <TextField
              label="RTO Status"
              select
              fullWidth
              margin="normal"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
          >
              <MuiMenuItem value="PENDING">PENDING</MuiMenuItem>
              <MuiMenuItem value="APPROVED">APPROVED</MuiMenuItem>
              <MuiMenuItem value="REJECTED">REJECTED</MuiMenuItem>
          </TextField>
          <TextField
            label="Certificate Number"
            fullWidth
            margin="normal"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value)}
          />
          <TextField
            label="Expiry Date"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateApproval}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Forwarding Dialog */}
      <Dialog open={!!forwardDialog} onClose={() => setForwardDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>Government Data Forwarding</DialogTitle>
        <DialogContent>
          <TextField
            label="Government Endpoint (URL)"
            fullWidth
            margin="normal"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="http://rto.gov.in/api/v1/forward"
          />
          <TextField
              label="Forwarding Status"
              select
              fullWidth
              margin="normal"
              value={forwardingEnabled}
              onChange={(e) => setForwardingEnabled(e.target.value === 'true')}
          >
              <MuiMenuItem value="true">Enable Forwarding</MuiMenuItem>
              <MuiMenuItem value="false">Disable Forwarding</MuiMenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateForwarding}>Save Configuration</Button>
        </DialogActions>
      </Dialog>

    </PageLayout>
  );
};

export default AIS140Page;
