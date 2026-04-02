import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import store from './store/index';
import { LocalizationProvider } from './common/components/LocalizationProvider';
import ErrorHandler from './common/components/ErrorHandler';
import Navigation from './Navigation';
import preloadImages from './map/core/preloadImages';
import NativeInterface from './common/components/NativeInterface';
import ServerProvider from './ServerProvider';
import ErrorBoundary from './ErrorBoundary';
import AppThemeProvider from './AppThemeProvider';

console.log('[BOOTSTRAP] Entry point reached.');

// ✅ SOVEREIGN GATEWAY: Global Fetch Interceptor
// Automatically injects the SaaS JWT token into all native fetch requests made by Traccar UI components and RTK Query.
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('saas_token');
  
  if (token) {
    let url = '';
    if (typeof resource === 'string') {
      url = resource;
    } else if (resource && resource.url) {
      url = resource.url;
    }
    
    if (url && url.includes('/api/') && !url.includes('/api/auth/')) {
      config = config || {};
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
      args[1] = config;
    }
  }
  return originalFetch(...args);
};

// Safety: Mount React even if preloading hangs
const bootstrap = () => {
  console.log('[BOOTSTRAP] Initializing root...');
  const loader = document.querySelector('.loader');
  if (loader) loader.remove();

  const root = createRoot(document.getElementById('root'));
  root.render(
    <ErrorBoundary>
      <Provider store={store}>
        <LocalizationProvider>
          <AppThemeProvider>
            <StyledEngineProvider injectFirst>
              <CssBaseline />
              <ServerProvider>
                <BrowserRouter>
                  <Navigation />
                </BrowserRouter>
                <ErrorHandler />
                <NativeInterface />
              </ServerProvider>
            </StyledEngineProvider>
          </AppThemeProvider>
        </LocalizationProvider>
      </Provider>
    </ErrorBoundary>,
  );
};

// Completely bypass preloading for now to fix the buffering issue
bootstrap();
