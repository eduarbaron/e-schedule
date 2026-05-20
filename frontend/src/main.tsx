import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import './index.css'
import App from './App.tsx'
import { ConfirmProvider } from './components/ConfirmProvider'
import { AuthProvider } from './context/AuthContext'

const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: [
      '#eaf1f9', '#cfe0f0', '#a8c5e4', '#7daaD8',
      '#5d94cf', '#528BC9', '#3f73aa', '#2e5a8a',
      '#264362', '#1a2f46',
    ],
    success: [
      '#f0f7e8', '#d9edc3', '#bede99', '#a2ce6f',
      '#8ec752', '#87BF58', '#6da040', '#558030',
      '#3e6022', '#294016',
    ],
  },
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: { radius: 'md' },
      styles: { root: { textTransform: 'none', letterSpacing: 'normal' } },
    },
    Badge: { defaultProps: { radius: 'md' } },
    Paper: { defaultProps: { radius: 'md' } },
  },
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <AuthProvider>
          <ConfirmProvider>
            <Notifications position="top-right" />
            <App />
          </ConfirmProvider>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
)
