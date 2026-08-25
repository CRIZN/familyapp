"use client";

import { useEffect, useState } from "react";

export function FamilyDisplayClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="text-right">
      <p className="text-5xl font-semibold tabular-nums tracking-tight text-zinc-50 sm:text-6xl lg:text-7xl">
        {new Intl.DateTimeFormat("en", {
          hour: "numeric",
          minute: "2-digit",
        }).format(now)}
      </p>
      <p className="mt-2 text-lg text-zinc-300 sm:text-xl lg:text-2xl">
        {new Intl.DateTimeFormat("en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(now)}
      </p>
    </div>
  );
}
