import React, { useState } from 'react';
import { supabase } from "@/studio-daw/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/studio-daw/utils/toast";
import { Loader2 } from "lucide-react";

const LoginForm = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        showSuccess("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        showSuccess("Welcome back!");
      }
    } catch (error: any) {
      showError(error.message || "An authentication error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAuth} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-400 text-xs uppercase tracking-widest font-bold">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-primary/40 text-white"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-400 text-xs uppercase tracking-widest font-bold">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-primary/40 text-white"
            required
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 rounded-xl bg-white text-black hover:bg-slate-200 font-bold transition-all"
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? "Create Studio Account" : "Enter Studio")}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold transition-colors"
        >
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;