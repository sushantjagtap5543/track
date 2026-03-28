// saas/src/main.jsx  — FIXED
//
// FIX 1: Wrap entire app with <ErrorBoundary> so crashes show a helpful UI
//         instead of a blank/white screen
// FIX 2: Ensure <Provider store={store}> is outermost so all components
//         can access the Redux store (missing Provider = undefined state = push() crash)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import store from './store';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* FIX: ErrorBoundary must be outermost to catch all component errors */}
    <ErrorBoundary>
      {/* FIX: Provider must wrap everything that uses useSelector/useDispatch */}
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
