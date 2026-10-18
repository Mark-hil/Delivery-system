// Web equivalent of the mobile build's AsyncStorage wrapper — same API shape
// (getJSON/setJSON/remove) so context code didn't need to change, just the
// underlying storage engine.
const KEYS = {
  session: "swiftsend:session",
  onboardingSeen: "swiftsend:onboardingSeen",
} as const;

export const storage = {
  keys: KEYS,

  getJSON<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJSON<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage can throw in private-browsing modes with strict quotas —
      // the app still works, it just won't persist the session across reloads.
    }
  },

  remove(key: string): void {
    window.localStorage.removeItem(key);
  },
};
