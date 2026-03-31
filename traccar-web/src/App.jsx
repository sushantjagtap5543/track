import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import BottomMenu from './common/components/BottomMenu';
import SocketController from './SocketController';
import CachingController from './CachingController';
import { useCatch, useEffectAsync } from './reactHelper';
import { sessionActions } from './store';
import UpdateController from './UpdateController';
import MotionController from './main/MotionController';
import TermsDialog from './common/components/TermsDialog';
import Loader from './common/components/Loader';
import fetchOrThrow from './common/util/fetchOrThrow';

const useStyles = makeStyles()(() => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    position: 'relative'
  },
  menu: {
    zIndex: 4,
    '@media print': {
      display: 'none',
    },
  },
}));

const App = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const newServer = useSelector((state) => state.session.server?.newServer);
  const termsUrl = useSelector((state) => state.session.server?.attributes?.termsUrl);
  const user = useSelector((state) => state.session.user);

  const acceptTerms = useCatch(async () => {
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, attributes: { ...user.attributes, termsAccepted: true } }),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  });

  useEffectAsync(async () => {
    if (!user) {
      try {
        const response = await fetch('/api/session');
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const user = await response.json();
          dispatch(sessionActions.updateUser(user));
        } else {
          // Fallback: If session check fails (404, 500, etc), try SaaS sync or show login
          const saasSync = await fetch('/api/auth/sync').catch(() => ({ ok: false }));
          if (saasSync.ok && saasSync.headers.get('content-type')?.includes('application/json')) {
            const saasData = await saasSync.json();
            if (saasData.token) {
              window.localStorage.setItem('saas_token', saasData.token);
              window.localStorage.setItem('saas_user', JSON.stringify(saasData.user));
              window.localStorage.setItem('saas_role', saasData.user.role);
              window.location.reload();
              return null;
            }
          }
          window.sessionStorage.setItem('postLogin', pathname + search);
          // ✅ FIX: Only redirect to register if it's truly a fresh server AND no SaaS token exist
          const hasSaasToken = !!window.localStorage.getItem('saas_token');
          if (newServer && !hasSaasToken) {
            navigate('/register', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }
      } catch (err) {
        // Network error or crash - redirect to login
        navigate('/login', { replace: true });
      }
    } else {
      // ✅ NEW: If user exists in Traccar, but saas_token is missing, try a background sync
      const token = window.localStorage.getItem('saas_token');
      if (!token) {
        fetch('/api/auth/sync').then(res => res.json()).then(data => {
            if (data.token) {
                window.localStorage.setItem('saas_token', data.token);
                window.localStorage.setItem('saas_user', JSON.stringify(data.user));
                window.localStorage.setItem('saas_role', data.user.role);
                console.log('[App] SaaS session synchronized in background');
            }
        }).catch(() => {});
      }
    }
    return null;
  }, [user]);

  if (user == null) {
    return <Loader />;
  }
  if (termsUrl && !user.attributes.termsAccepted) {
    return <TermsDialog open onCancel={() => navigate('/login')} onAccept={() => acceptTerms()} />;
  }
  return (
    <>
      <SocketController />
      <CachingController />
      <UpdateController />
      <MotionController />
      <div className={classes.page}>
        <Outlet />
      </div>
      {!desktop && (
        <div className={classes.menu}>
          <BottomMenu />
        </div>
      )}
    </>
  );
};

export default App;
