"use client";

import { LoaderCircle } from "lucide-react";

export function Loading({ title }: { title: string | null }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-16 w-16 animate-spin text-white" />
        <span className="text-white text-lg font-semibold">{title}</span>
      </div>
    </div>
  );
}
