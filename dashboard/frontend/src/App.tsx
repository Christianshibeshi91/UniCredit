import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { useWebSocket } from "@/hooks/useWebSocket"
import Layout from "@/components/Layout"
import LoginPage from "@/pages/LoginPage"
import DashboardPage from "@/pages/DashboardPage"
import JobsPage from "@/pages/JobsPage"
import JobDetailPage from "@/pages/JobDetailPage"
import AnalyticsPage from "@/pages/AnalyticsPage"
import FollowUpsPage from "@/pages/FollowUpsPage"
import SettingsPage from "@/pages/SettingsPage"
import IntakePage from "@/pages/IntakePage"
import ErrorsPage from "@/pages/ErrorsPage"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function AuthenticatedApp() {
  useWebSocket()
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/intake" element={<IntakePage />} />
        <Route path="/errors" element={<ErrorsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
