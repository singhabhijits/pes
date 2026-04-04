import axios from 'axios';

const DEFAULT_DEV_PORT = import.meta.env.VITE_BACKEND_PORT || '5000';
const DEFAULT_LOCAL_API_URL = `http://localhost:${DEFAULT_DEV_PORT}`;

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL?.trim() || DEFAULT_LOCAL_API_URL
).replace(/\/+$/, '');

function rewriteUrl(url: string) {
  return url.replace(/^http:\/\/localhost:\d+/, API_BASE_URL);
}

let apiConfigured = false;

export function configureApiClients() {
  if (apiConfigured) {
    return;
  }

  apiConfigured = true;

  axios.interceptors.request.use((config) => {
    if (typeof config.url === 'string') {
      config.url = rewriteUrl(config.url);
    }

    return config;
  });

  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      return originalFetch(rewriteUrl(input), init);
    }

    if (input instanceof Request) {
      const updatedUrl = rewriteUrl(input.url);

      if (updatedUrl !== input.url) {
        return originalFetch(new Request(updatedUrl, input), init);
      }
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;
}
