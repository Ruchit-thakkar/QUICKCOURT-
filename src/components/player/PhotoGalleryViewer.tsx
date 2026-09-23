"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react";
import { getImageKitUrl, IMAGE_PRESETS } from "@/lib/imagekit";
import type { BusinessImageItem } from "@/types";
import { cn } from "@/lib/cn";

interface PhotoGalleryViewerProps {
  photos: BusinessImageItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  coverUrl?: string;
}

export function PhotoGalleryViewer({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  businessName,
  coverUrl,
}: PhotoGalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);

  // Touch swipe support on mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)));
      setImageLoading(true);
    }
  }, [isOpen, initialIndex, photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setImageLoading(true);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setImageLoading(true);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scrolling when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (diff > minSwipeDistance) {
      // Swiped Left -> Next
      handleNext();
    } else if (diff < -minSwipeDistance) {
      // Swiped Right -> Prev
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const isCover = coverUrl && currentPhoto?.url === coverUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo Gallery Viewer"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-md transition-opacity animate-in fade-in duration-200 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Controls Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-qc-black/60 z-10">
        <div>
          <h2 className="text-xs sm:text-sm font-display tracking-wider text-qc-white uppercase">
            {businessName || "Venue Photos"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-qc-lime font-bold">
              {currentIndex + 1} / {photos.length}
            </span>
            {isCover && (
              <span className="inline-flex items-center gap-1 border border-qc-lime/50 bg-qc-lime/10 px-1.5 py-0.5 text-[9px] font-bold text-qc-lime uppercase tracking-wider">
                <Star className="h-2.5 w-2.5 fill-qc-lime text-qc-lime" />
                <span>Primary Cover</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close photo gallery"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Image Area with Prev/Next Navigation */}
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            aria-label="Previous photo"
            className="absolute left-2 sm:left-6 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:border-qc-lime hover:text-qc-lime hover:bg-black/90 transition active:scale-90"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Current Image */}
        <div className="relative flex h-full w-full max-h-[75vh] max-w-5xl items-center justify-center">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentPhoto.url}
            src={getImageKitUrl(currentPhoto.url, IMAGE_PRESETS.FULLSCREEN)}
            alt={currentPhoto.name || `${businessName || "Venue"} photo ${currentIndex + 1}`}
            onLoad={() => setImageLoading(false)}
            className={cn(
              "max-h-full max-w-full object-contain transition-opacity duration-300 shadow-2xl",
              imageLoading ? "opacity-0" : "opacity-100"
            )}
          />
        </div>

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            aria-label="Next photo"
            className="absolute right-2 sm:right-6 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:border-qc-lime hover:text-qc-lime hover:bg-black/90 transition active:scale-90"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="px-4 py-3 sm:px-6 border-t border-white/10 bg-qc-black/80 overflow-x-auto z-10">
          <div className="flex items-center justify-center gap-2 min-w-max mx-auto">
            {photos.map((p, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={p.fileId || p.url}
                  onClick={() => {
                    if (idx !== currentIndex) {
                      setImageLoading(true);
                      setCurrentIndex(idx);
                    }
                  }}
                  className={cn(
                    "relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 overflow-hidden border transition",
                    isSelected
                      ? "border-qc-lime shadow-md shadow-qc-lime/20 scale-105"
                      : "border-white/15 opacity-50 hover:opacity-100 hover:border-white/30"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageKitUrl(p.url, IMAGE_PRESETS.THUMB)}
                    alt={`Thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
