import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("No verification token found.");
        return;
      }

      try {
        const res = await api.get(`/auth/verify?token=${token}`);
        setStatus("success");
        setMessage(res.data.message);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed.");
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl shadow-primary/5 text-center"
      >
        {status === "loading" && (
          <div className="space-y-6">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <h1 className="text-3xl font-bold text-gray-900 tracking-tighter">Verifying...</h1>
            <p className="text-gray-500">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-3xl font-bold text-gray-900 tracking-tighter">Verified!</h1>
            <p className="text-gray-500 font-medium">{message}</p>
            <Link to="/login">
              <Button className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg mt-4 shadow-xl shadow-primary/20">
                Go to Login
              </Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-3xl font-bold text-gray-900 tracking-tighter">Verification Failed</h1>
            <p className="text-gray-500 font-medium">{message}</p>
            <Link to="/signup">
              <Button variant="outline" className="w-full h-14 border-gray-100 rounded-2xl font-bold text-lg mt-4">
                Try Signing Up Again
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
