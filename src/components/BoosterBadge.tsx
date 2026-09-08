import { Sparkles } from "lucide-react";

export default function BoosterBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const isSmall = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-pink/40 bg-pink/10 font-medium text-pink ${
        isSmall ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      <Sparkles size={isSmall ? 10 : 12} />
      Booster
    </span>
  );
}
