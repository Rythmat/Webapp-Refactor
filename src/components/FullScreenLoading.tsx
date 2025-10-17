import { Logo } from './Logo';

export const FullScreenLoading = () => {
  return (
    <div className="flex h-dvh w-full animate-fade-in-bottom items-center justify-center">
      <div className="text-2xl font-bold">
        <Logo className="size-14 animate-pulse" />
      </div>
    </div>
  );
};
