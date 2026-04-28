"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface ImageLightboxProps {
  isOpen: boolean;
  imagePaths: string[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  imagePaths,
  currentIndex,
  onClose,
  onChangeIndex,
}) => {
  const hasImages = imagePaths.length > 0;
  const currentPath = hasImages ? imagePaths[currentIndex] : null;
  const signedUrl = useSignedUrl(currentPath || "");
  const canNavigate = imagePaths.length > 1;

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (!canNavigate) return;

      if (event.key === "ArrowLeft") {
        onChangeIndex((currentIndex - 1 + imagePaths.length) % imagePaths.length);
      } else if (event.key === "ArrowRight") {
        onChangeIndex((currentIndex + 1) % imagePaths.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, onChangeIndex, currentIndex, imagePaths.length, canNavigate]);

  if (!isOpen || !hasImages || !currentPath) return null;

  const goPrev = () => onChangeIndex((currentIndex - 1 + imagePaths.length) % imagePaths.length);
  const goNext = () => onChangeIndex((currentIndex + 1) % imagePaths.length);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        aria-label="סגירת תצוגת תמונה"
      >
        <X size={22} />
      </button>

      {canNavigate && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute right-4 md:right-8 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          aria-label="תמונה קודמת"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div className="relative z-10 flex max-h-[90vh] max-w-[92vw] items-center justify-center">
        {!signedUrl ? (
          <div className="rounded-xl bg-white/10 px-6 py-4 text-sm text-white flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            טוען תמונה...
          </div>
        ) : (
          <Image
            src={signedUrl}
            alt={`תמונה ${currentIndex + 1}`}
            width={2000}
            height={1400}
            className="max-h-[90vh] w-auto rounded-xl object-contain"
            unoptimized
          />
        )}
      </div>

      {canNavigate && (
        <button
          type="button"
          onClick={goNext}
          className="absolute left-4 md:left-8 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          aria-label="תמונה הבאה"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {canNavigate && (
        <div className="absolute bottom-4 z-20 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
          {currentIndex + 1} / {imagePaths.length}
        </div>
      )}
    </div>
  );
};
