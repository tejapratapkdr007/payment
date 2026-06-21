import { useEffect, useState } from "react";

function getRemaining(deadline: Date) {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes };
}

export function CountdownTimer({ deadline }: { deadline: string | null | undefined }) {
  const target = deadline ? new Date(deadline) : null;
  const [remaining, setRemaining] = useState(() => (target ? getRemaining(target) : null));

  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => setRemaining(getRemaining(target)), 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!target) return null;

  if (!remaining) {
    return <span className="text-xs font-medium text-danger">Deadline passed</span>;
  }

  const urgent = remaining.days < 1;

  return (
    <span className={`text-xs font-medium figure ${urgent ? "text-danger" : "text-ink-400"}`}>
      {remaining.days > 0 ? `${remaining.days}d ` : ""}
      {remaining.hours}h {remaining.minutes}m left
    </span>
  );
}
