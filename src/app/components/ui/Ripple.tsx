import { useState, type MouseEvent } from "react";
import { clsx } from "clsx";

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export function useRipple<T extends HTMLElement>() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onClick = (event: MouseEvent<T>) => {
    const trigger = event.currentTarget;
    const rect = trigger.getBoundingClientRect();

    const newRipple: Ripple = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      id: new Date().getTime(),
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  const RippleComponent = () => (
    <>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className={clsx(
            "animate-ripple absolute block rounded-full bg-white",
          )}
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: "translate(-50%, -50%)",
            width: "1px",
            height: "1px",
          }}
        />
      ))}
    </>
  );

  return { onClick, RippleComponent };
}
