import { useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { useNavigate } from "react-router-dom";

const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      console.log("Redirect check - User:", user?.email, "Role:", user?.role);
      
      if (!user) {
        navigate("/login");
      } else if (user.role === "CREATOR" || user.role === "ADMIN") {
        navigate("/creator-dashboard");
      } else {
        navigate("/explore");
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default DashboardRedirect;
