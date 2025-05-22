// src/app/loading.tsx
import { ClipLoader } from 'react-spinners';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <ClipLoader color="#3b82f6" size={50} />
    </div>
  );
}