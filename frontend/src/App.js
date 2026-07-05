import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import BottomNav from "@/components/BottomNav";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import Discover from "@/pages/Discover";
import Groups from "@/pages/Groups";
import GroupDetail from "@/pages/GroupDetail";
import MisPlanes from "@/pages/MisPlanes";
import Chats from "@/pages/Chats";
import ChatDetail from "@/pages/ChatDetail";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import NecesitoApoyo from "@/pages/NecesitoApoyo";
import Admin from "@/pages/Admin";

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E0F13]">
      <div className="w-14 h-14 rounded-full border-4 border-white/10 border-t-[#FF6B5E] animate-spin"/>
    </div>
  );
}

function RequireAuth({ children, requireOnboarding = true, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/app/descubrir" replace />;
  if (requireOnboarding && !user.onboarding_complete && user.role !== "admin") return <Navigate to="/onboarding" replace />;
  return children;
}

function AppShell() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" theme="dark" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/onboarding" element={<RequireAuth requireOnboarding={false}><Onboarding /></RequireAuth>} />

          <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<Navigate to="descubrir" replace />} />
            <Route path="descubrir" element={<Discover />} />
            <Route path="grupos" element={<Groups />} />
            <Route path="grupos/:id" element={<GroupDetail />} />
            <Route path="mis-planes" element={<MisPlanes />} />
            <Route path="chats" element={<Chats />} />
            <Route path="chats/:matchId" element={<ChatDetail />} />
            <Route path="perfil" element={<Profile />} />
            <Route path="perfil/editar" element={<EditProfile />} />
            <Route path="necesito-apoyo" element={<NecesitoApoyo />} />
          </Route>

          <Route path="/admin" element={<RequireAuth adminOnly requireOnboarding={false}><Admin /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
