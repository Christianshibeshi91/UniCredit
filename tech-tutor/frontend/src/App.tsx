import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AskPage } from "./pages/AskPage";
import { LessonsPage } from "./pages/LessonsPage";
import { NotebooksPage } from "./pages/NotebooksPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AskPage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="notebooks" element={<NotebooksPage />} />
      </Route>
    </Routes>
  );
}
