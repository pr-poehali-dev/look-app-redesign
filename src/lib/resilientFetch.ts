const RETRY_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const waitOnline = (maxMs: number) =>
  new Promise<void>((resolve) => {
    if (typeof navigator === "undefined" || navigator.onLine) return resolve();
    const done = () => {
      window.removeEventListener("online", done);
      clearTimeout(t);
      resolve();
    };
    const t = setTimeout(done, maxMs);
    window.addEventListener("online", done);
  });

export const installResilientFetch = () => {
  if (typeof window === "undefined" || (window as unknown as { __rf?: boolean }).__rf) return;
  (window as unknown as { __rf?: boolean }).__rf = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "GET" || init?.signal?.aborted) return original(input, init);

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await waitOnline(8000);
        const res = await original(input, init);
        if (!RETRY_STATUSES.has(res.status) || attempt === MAX_RETRIES) return res;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") throw e;
        lastError = e;
        if (attempt === MAX_RETRIES) throw e;
      }
      await sleep(Math.min(500 * 2 ** attempt, 4000) + Math.random() * 300);
    }
    throw lastError;
  };
};
