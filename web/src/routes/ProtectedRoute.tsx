import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export function ProtectedRoute() {
  const { access, hydrated } = useAuth();
  const location = useLocation();

  if (!hydrated) return null;
  if (!access) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}