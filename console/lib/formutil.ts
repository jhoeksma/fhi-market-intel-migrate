// Plain helpers for pulling typed values out of FormData in server actions.
// Not itself a "use server" module — server action files import these.

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function int(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : Math.trunc(n);
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true";
}

export function csvArray(fd: FormData, key: string): string[] | null {
  const s = str(fd, key);
  if (s === null) return null;
  const parts = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}
