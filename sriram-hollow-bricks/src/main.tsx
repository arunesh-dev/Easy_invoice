import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from './app/providers'
import { router } from './app/router'
import './index.css'

import { ErrorBoundary } from '@/core/observability/ErrorBoundary'
import { db } from '@/core/db/schema'

db.open()
  .then(() => {
    console.log('[Dexie] opened. version:', db.verno, 'tables:', db.tables.map(t => t.name))
  })
  .catch((err) => {
    console.error('[Dexie] open failed:', err)
  })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>
)
