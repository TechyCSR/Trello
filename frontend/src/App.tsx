import { Navigate, Route, Routes } from "react-router-dom";

import { Navbar } from "@/components/Navbar";
import { ToastViewport } from "@/components/ToastViewport";
import { BoardsPage } from "@/pages/BoardsPage";
import { BoardWorkspacePage } from "@/pages/BoardWorkspacePage";
import { HomePage } from "@/pages/HomePage";
import { useAppStore } from "@/store/useAppStore";

export default function App() {
  const currentUser = useAppStore((s) => s.currentUser);

  return (
    <div className="min-h-screen bg-background">
      {currentUser && <Navbar />}
      <ToastViewport />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:username/boards" element={<BoardsPage />} />
        <Route path="/:username/boards/:boardId" element={<BoardWorkspacePage />} />
        <Route path="/boards" element={<Navigate to="/" replace />} />
        <Route path="/boards/:boardId" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
