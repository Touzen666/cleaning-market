import React from "react";
import { FaStar } from "react-icons/fa";

const FallingStars = ({ count = 20 }: { count?: number }) => {
  return (
    <div className="falling-stars-container">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * -100}vh`,
            animationDuration: `${Math.random() * 2 + 3}s`, // 3s to 5s
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          <FaStar />
        </div>
      ))}
    </div>
  );
};

export default FallingStars;
