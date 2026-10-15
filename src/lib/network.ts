type Conn = { saveData?: boolean; effectiveType?: string };

export const isSlowNetwork = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { connection?: Conn }).connection;
  return !!c && (!!c.saveData || c.effectiveType === "slow-2g" || c.effectiveType === "2g" || c.effectiveType === "3g");
};

export const pollMs = (base: number): number => (isSlowNetwork() ? base * 2 : base);
