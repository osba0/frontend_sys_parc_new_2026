import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Configuration TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        5 * 60 * 1000,  // 5 minutes — données stables
      gcTime:           10 * 60 * 1000, // 10 minutes en cache
      retry:            1,               // 1 seul retry en cas d'erreur
      refetchOnWindowFocus: false,       // Pas de refetch automatique au focus
    },
    mutations: {
      retry: 0,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#27AE60', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#E74C3C', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
)
