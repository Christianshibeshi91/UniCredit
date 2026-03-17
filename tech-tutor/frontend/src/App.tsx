import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AskPage } from "./pages/AskPage";
import { LessonsPage } from "./pages/LessonsPage";
import { NotebooksPage } from "./pages/NotebooksPage";
import { QuizPage } from "./pages/QuizPage";
import { ReviewPage } from "./pages/ReviewPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TextbookPage } from "./pages/TextbookPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AskPage />} />
        <Route path="textbook" element={<TextbookPage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="notebooks" element={<NotebooksPage />} />
      </Route>
    </Routes>
  );
}
