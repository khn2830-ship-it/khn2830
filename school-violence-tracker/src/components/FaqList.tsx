"use client";

import { FAQ_DATA } from "@/lib/faq";
import type { RoleOption } from "@/lib/constants";

export default function FaqList({ role }: { role: RoleOption }) {
  const items = FAQ_DATA[role] ?? [];
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <details key={idx} className="rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer font-medium text-slate-800">{item.q}</summary>
          <p className="mt-2 text-sm text-slate-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
