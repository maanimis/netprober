
export function sanitizeHost(raw: string): string {
  let h = raw.replace(/["'\s]/g, "").trim();
  h = h.replace(/[?&].*$/, "");
  if (/^[\d.]+\/\d+$/.test(h)) return h;
  const m = h.match(/(?:https?:\/\/)?([a-zA-Z0-9._\-:/]+)/);
  return m ? m[1] : h;
}

export function isCIDR(target: string): boolean {
  if (!target.includes("/")) return false;
  try {
    const [base, prefix] = target.split("/");
    const parts = base.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255))
      return false;
    const p = parseInt(prefix, 10);
    return !Number.isNaN(p) && p >= 0 && p <= 32;
  } catch {
    return false;
  }
}

export function expandCIDR(cidr: string): string[] {
  const [base, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr, 10);
  const parts = base.split(".").map(Number);
  const baseInt =
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (baseInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  const ips: string[] = [];
  const start = prefix >= 31 ? network : network + 1;
  const end = prefix >= 31 ? broadcast : broadcast - 1;

  for (let i = start; i <= end; i++) {
    ips.push(
      `${(i >>> 24) & 0xff}.${(i >>> 16) & 0xff}.${(i >>> 8) & 0xff}.${i & 0xff}`,
    );
  }
  return ips;
}
