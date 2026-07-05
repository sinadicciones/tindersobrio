import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import BottomNav from "@/components/BottomNav";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { ForgotPassword, ResetPassword } from "@/pages/PasswordFlows";
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
import Terminos from "@/pages/Terminos";
import Privacidad from "@/pages/Privacidad";
import CuentaSuspendida from "@/pages/CuentaSuspendida";
import Waitlist from "@/pages/Waitlist";
import AuthCallback from "@/pages/AuthCallback";
import PublicProfile from "@/pages/PublicProfile";

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
      <div className="pb-nav min-h-screen">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}

function AppRouter() {
  const location = useLocation();
  // Detect Emergent Google Auth callback SYNCHRONOUSLY during render (not in useEffect)
  // to avoid race conditions with AuthProvider's /auth/me call.
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/olvide-contrasena" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/cuenta-suspendida" element={<CuentaSuspendida />} />
      <Route path="/waitlist" element={<Waitlist />} />
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
        <Route path="usuario/:id" element={<PublicProfile />} />
        <Route path="necesito-apoyo" element={<NecesitoApoyo />} />
      </Route>

      <Route path="/admin" element={<RequireAuth adminOnly requireOnboarding={false}><Admin /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" theme="dark" richColors />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
