export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeByPrefix(prefix: string): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  }
}
