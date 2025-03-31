"use client";
import { useLoading } from "@/contexts/loading-context";

export default function LoadingOverlay() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="w-16 h-16 border-4 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
      </div>
  );
}
