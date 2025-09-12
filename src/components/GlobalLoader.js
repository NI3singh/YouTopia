'use client';

import { useLoading } from '@/context/LoadingContext';
import Loader from '@/components/Loader';

export default function GlobalLoader() {
  const { isLoading } = useLoading();

  // ADD THIS LOG to see what value the component is getting
  console.log(`[GlobalLoader] Rendering with isLoading: ${isLoading}`);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
      <Loader />
    </div>
  );
}