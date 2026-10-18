// Every mock API call awaits this so the UI exercises its real loading states.
// Swap this file's usages for actual fetch/axios calls when the backend is ready —
// every service function already returns a Promise with the same shape it would from a real API.
export const mockDelay = (ms = 700): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
