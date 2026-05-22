import { Navigate, Route, Routes } from "react-router-dom";

import { Navbar } from "@/components/Navbar";
import { BoardsPage } from "@/pages/BoardsPage";
import { BoardWorkspacePage } from "@/pages/BoardWorkspacePage";
import { HomePage } from "@/pages/HomePage";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/boards/:boardId" element={<BoardWorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
