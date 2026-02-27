import { supabase } from "@/studio-daw/integrations/supabase/client";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import LoginForm from '@/studio-daw/components/LoginForm';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-[#1a1a1a] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase">Prism</h1>
          <p className="text-slate-400 font-medium">Your Generative Music Workspace</p>
        </div>

        <LoginForm />
        
        <div className="text-center pt-8 border-t border-white/5">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">Secure Cloud Sync Enabled</p>
        </div>
      </div>
    </div>
  );
};

export default Login;