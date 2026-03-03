"use client";
import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
}

export const StarRating = ({ value, onChange }: StarRatingProps) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            className="p-0.5 transition-transform hover:scale-110"
            data-testid={`feedback-star-${star}`}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-600"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
