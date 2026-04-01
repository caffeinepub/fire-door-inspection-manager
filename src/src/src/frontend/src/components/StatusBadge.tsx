import { InspectionStatus } from "../backend";

interface StatusBadgeProps {
  status: InspectionStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const base = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  if (status === InspectionStatus.pass) {
    return (
      <span
        className={`${base} inline-flex items-center gap-1 rounded-full font-semibold bg-green-100 text-green-800 border border-green-200`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Pass
      </span>
    );
  }
  if (status === InspectionStatus.fail) {
    return (
      <span
        className={`${base} inline-flex items-center gap-1 rounded-full font-semibold bg-red-100 text-red-800 border border-red-200`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Fail
      </span>
    );
  }
  return (
    <span
      className={`${base} inline-flex items-center gap-1 rounded-full font-semibold bg-orange-100 text-orange-800 border border-orange-200`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      Action Required
    </span>
  );
}
