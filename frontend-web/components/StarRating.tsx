"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface StarRatingProps {
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}

export default function StarRating({ initialRating = 0, onRatingChange, interactive = true }: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleClick = (val: number) => {
    if (!interactive) return;
    setRating(val);
    if (onRatingChange) onRatingChange(val);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={interactive ? { scale: 1.15 } : {}}
            whileTap={interactive ? { scale: 0.95 } : {}}
            onClick={() => handleClick(star)}
            onMouseEnter={() => interactive && setHover(star)}
            onMouseLeave={() => interactive && setHover(0)}
            className={`focus:outline-none transition-colors ${interactive ? "cursor-pointer p-0.5" : "cursor-default"}`}
          >
            <Star
              size={interactive ? 22 : 14}
              className={`${
                (hover || rating) >= star 
                  ? "text-amber-400 fill-amber-400" 
                  : "text-gray-200"
              } transition-colors`}
            />
          </motion.button>
        ))}
      </div>
      {rating > 0 && (
        <span className="ml-2 text-xs font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
          {rating}.0
        </span>
      )}
    </div>
  );
}
