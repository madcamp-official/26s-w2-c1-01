import { Route, Routes } from "react-router-dom";
import { MainPage } from "./pages/MainPage";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { MyPage } from "./pages/MyPage";
import { InputUploadPage } from "./pages/InputUploadPage";
import { ProjectEditPage } from "./pages/ProjectEditPage";
import { CvManagePage } from "./pages/CvManagePage";
import { AnalysisProgressPage } from "./pages/AnalysisProgressPage";
import { RecommendationResultPage } from "./pages/RecommendationResultPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/github/callback" element={<AuthCallbackPage />} />
      <Route path="/my" element={<MyPage />} />
      <Route path="/analyze" element={<InputUploadPage />} />
      <Route path="/projects" element={<ProjectEditPage />} />
      <Route path="/cvs" element={<CvManagePage />} />
      <Route path="/progress" element={<AnalysisProgressPage />} />
      <Route path="/result/:id" element={<RecommendationResultPage />} />
    </Routes>
  );
}

export default App;
