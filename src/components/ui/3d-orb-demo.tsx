import ModalSphere from '@/components/ui/3d-orb';

export default function ModalSphereDemo() {
  return (
    <main className="relative flex min-h-screen items-center bg-[hsl(var(--ui-background))]">
      <h1 className="sr-only">Modal Sphere</h1>
      <ModalSphere />
    </main>
  );
}
