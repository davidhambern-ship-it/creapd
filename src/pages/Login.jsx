import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthImmersiveLayout from "@/components/AuthImmersiveLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <AuthImmersiveLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-medium hover:underline" style={{ color: "hsl(190 80% 60%)" }}>
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6 bg-white text-black hover:bg-white/90 border-0"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: "hsl(190 30% 25% / 0.3)" }} />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-3" style={{ background: "hsl(220 25% 8% / 0.9)", color: "hsl(220 10% 50%)" }}>or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" style={{ color: "hsl(220 10% 65%)" }}>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(190 60% 50%)" }} aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              style={{
                background: "hsl(220 25% 6% / 0.6)",
                borderColor: "hsl(190 30% 25% / 0.3)",
                color: "hsl(0 0% 95%)",
              }}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" style={{ color: "hsl(220 10% 65%)" }}>Password</Label>
            <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: "hsl(190 70% 55%)" }}>
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(190 60% 50%)" }} aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              style={{
                background: "hsl(220 25% 6% / 0.6)",
                borderColor: "hsl(190 30% 25% / 0.3)",
                color: "hsl(0 0% 95%)",
              }}
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full h-12 font-medium"
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, hsl(270 70% 55%), hsl(250 70% 50%))",
            border: "1px solid hsl(270 60% 60% / 0.4)",
            boxShadow: "0 0 20px hsl(270 70% 50% / 0.2)",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthImmersiveLayout>
  );
}