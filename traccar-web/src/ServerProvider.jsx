import { useState } from 'react';
import { Alert, IconButton } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { useDispatch, useSelector } from 'react-redux';
import { useEffectAsync } from './reactHelper';
import { sessionActions } from './store';
import Loader from './common/components/Loader';

const ServerProvider = ({ children }) => {
  const dispatch = useDispatch();

  const initialized = useSelector((state) => !!state.session.server);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffectAsync(async () => {
    if (!error) {
      try {
        const response = await fetch('/api/server');
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const server = await response.json();
          dispatch(sessionActions.updateServer(server));
          setIsLoaded(true);
        } else {
          setError(`Server error: ${response.status} ${response.statusText}`);
          // Still initialize but with null server to allow fallback to change server
          setIsLoaded(true);
        }
      } catch (e) {
        setError(e.message);
        setIsLoaded(true);
      }
    }
  }, [error]);

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={() => setError(null)}>
            <ReplayIcon fontSize="inherit" />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }
  if (!isLoaded && !initialized) {
    return <Loader />;
  }
  return children;
};

export default ServerProvider;
