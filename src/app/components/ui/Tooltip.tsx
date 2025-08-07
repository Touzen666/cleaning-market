import {
  useState,
  useRef,
  type ReactNode,
  cloneElement,
  isValidElement,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
import { clsx } from "clsx";
import type { Placement } from "@popperjs/core";

interface TooltipProps {
  content: ReactNode;
  children: React.ReactElement;
  placement?: Placement;
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = "top",
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const referenceElement = useRef<HTMLElement | null>(null);
  const popperElement = useRef<HTMLDivElement | null>(null);
  const arrowElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { styles, attributes } = usePopper(
    referenceElement.current,
    popperElement.current,
    {
      placement,
      modifiers: [
        { name: "offset", options: { offset: [0, 8] } },
        {
          name: "arrow",
          options: {
            element: arrowElement.current,
          },
        },
      ],
    },
  );

  const isTouchDevice =
    typeof window !== "undefined" && "ontouchstart" in window;

  const showTooltip = () => !isTouchDevice && setVisible(true);
  const hideTooltip = () => !isTouchDevice && setVisible(false);
  const toggleTooltip = () => isTouchDevice && setVisible((v) => !v);

  if (!isValidElement<React.HTMLProps<HTMLElement>>(children)) {
    return <>{children}</>;
  }

  const childWithProps = cloneElement(children, {
    ref: referenceElement,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      showTooltip();
      if (children.props.onMouseEnter) {
        children.props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      hideTooltip();
      if (children.props.onMouseLeave) {
        children.props.onMouseLeave(e);
      }
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      toggleTooltip();
      if (children.props.onClick) {
        children.props.onClick(e);
      }
    },
  });

  const tooltipComponent = visible && isMounted && (
    <div
      ref={popperElement}
      style={styles.popper}
      {...attributes.popper}
      className={clsx(
        "tooltip z-tooltip rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-white shadow-lg",
        className,
      )}
      role="tooltip"
    >
      {content}
      <div ref={arrowElement} style={styles.arrow} className="tooltip-arrow" />
    </div>
  );

  return (
    <>
      {childWithProps}
      {isMounted && document.body
        ? createPortal(tooltipComponent, document.body)
        : null}
    </>
  );
}
