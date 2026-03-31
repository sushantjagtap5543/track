import React, { useState } from 'react';
import { Box, Typography, Button, TextField, CircularProgress, Alert } from '@mui/material';
import QRCodeSafe from 'react-qr-code'; // Assuming it might be available or use a simple img if qrcode-url is returned

const MfaSetup = ({ onEnabled }) => {
  const [step, setStep] = useState(0); // 0: initial, 1: setup, 2: verified
  const [qrData, setQrData] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('saas_token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQrData(data);
        setStep(1);
      }
    } catch (e) {
      setError('Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('saas_token')}` 
        },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        setStep(2);
        if (onEnabled) onEnabled();
      } else {
        const data = await res.json();
        setError(data.error || 'Verification failed');
      }
    } catch (e) {
      setError('Network error during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.02)' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#3b82f6' }}>
        Two-Factor Authentication (2FA)
      </Typography>

      {step === 0 && (
        <Box>
          <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
            Enhance your account security with two-factor authentication using time-based one-time passwords (TOTP).
          </Typography>
          <Button variant="contained" onClick={handleStartSetup} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Setup 2FA Now'}
          </Button>
        </Box>
      )}

      {step === 1 && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
            Step 1: Scan this QR code with your Authenticator App
          </Typography>
          {qrData?.qrCodeUrl && (
            <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: '12px', display: 'inline-block', mb: 2 }}>
                <img src={qrData.qrCodeUrl} alt="MFA QR Code" style={{ width: '200px', height: '200px' }} />
            </Box>
          )}
          <Typography variant="caption" sx={{ display: 'block', mb: 3, opacity: 0.6 }}>
            Or enter secret manually: <strong>{qrData?.secret}</strong>
          </Typography>

          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
            Step 2: Enter the 6-digit code from your app
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Verification Code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            sx={{ mb: 2, maxWidth: '250px' }}
          />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box>
            <Button variant="contained" onClick={handleVerify} disabled={loading || token.length < 6} color="success">
                {loading ? <CircularProgress size={20} /> : 'Verify & Enable'}
            </Button>
          </Box>
        </Box>
      )}

      {step === 2 && (
        <Alert severity="success" variant="filled" sx={{ borderRadius: '12px' }}>
          2FA is active on your account.
        </Alert>
      )}
    </Box>
  );
};

export default MfaSetup;
