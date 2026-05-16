"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { getExerciseImageUrl, EXERCISE_IMAGE_FALLBACK_COLORS } from "@/lib/workout/exercise-images";
import { cn } from "@/lib/utils";

interface ExerciseImageProps {
  name: string;
  muscleGroup?: string;
  className?: string;
  /** "card" = square thumbnail, "detail" = larger banner */
  variant?: "card" | "detail" | "icon";
}

export function ExerciseImage({ name, muscleGroup = "Other", className, variant = "card" }: ExerciseImageProps) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getExerciseImageUrl(name);

  const fallbackBg = EXERCISE_IMAGE_FALLBACK_COLORS[muscleGroup] ?? "bg-muted";

  const sizeClass =
    variant === "detail" ? "h-48 w-full" :
    variant === "icon"   ? "h-12 w-12 rounded-lg" :
                           "h-24 w-full";

  if (!imageUrl || failed) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-md",
        fallbackBg,
        sizeClass,
        className,
      )}>
        <Dumbbell className={cn(
          "text-muted-foreground/50",
          variant === "icon" ? "h-5 w-5" : variant === "detail" ? "h-12 w-12" : "h-8 w-8"
        )} />
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-md bg-muted", sizeClass, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={name}
        className="h-full w-full object-cover object-center"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}
