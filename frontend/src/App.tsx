import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CollectionConsentPage } from "./pages/CollectionConsentPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { JobPostingPage } from "./pages/JobPostingPage";
import { JobPostingAnalysisPage } from "./pages/JobPostingAnalysisPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/github/callback" element={<AuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collect"
        element={
          <ProtectedRoute>
            <CollectionConsentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-posting"
        element={
          <ProtectedRoute>
            <JobPostingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-postings/:jobPostingId/analysis"
        element={
          <ProtectedRoute>
            <JobPostingAnalysisPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
