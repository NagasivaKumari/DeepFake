import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './registerServiceWorker';

const LazyApp = React.lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <LazyApp />
    </Suspense>
  </React.StrictMode>
);
