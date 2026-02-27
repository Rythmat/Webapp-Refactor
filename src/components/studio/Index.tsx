import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { useMemo } from 'react';
import StudioDawPage from '@/studio-daw/pages/Index';
import '@/studio-daw/globals.css';

export const Index = () => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" expand={false} richColors />
        <StudioDawPage />
      </TooltipProvider>
    </QueryClientProvider>
  );
};
