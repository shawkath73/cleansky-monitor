import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export default function GlassCard({
  children,
  className = "",
  animate = true,
  delay = 0,
}: GlassCardProps) {
  const animClass = animate
    ? delay > 0
      ? `animate-fade-in-delay-${delay}`
      : "animate-fade-in"
    : "";

  return (
    <div
      className={`glass p-6 ${animClass} ${className}`}
      style={
        delay > 0 && delay > 3
          ? { animation: `fadeInUp 0.5s ease-out ${delay * 0.1}s forwards`, opacity: 0 }
          : undefined
      }
    >
      {children}
    </div>
  );
}
