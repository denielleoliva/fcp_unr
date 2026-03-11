// Persistent Storage Helper
// Uses window.storage (artifact persistent storage) with localStorage as fallback.
// All training data and the kNN model survive browser clears via window.storage.

const store = {
  async get(key) {
    try {
      if (window.storage) {
        const result = await window.storage.get(key);
        return result ? result.value : null;
      }
    } catch (_) {}
    return localStorage.getItem(key);
  },
  async set(key, value) {
    try {
      if (window.storage) {
        await window.storage.set(key, value);
        return;
      }
    } catch (_) {}
    localStorage.setItem(key, value);
  },
  async remove(key) {
    try {
      if (window.storage) {
        await window.storage.delete(key);
        return;
      }
    } catch (_) {}
    localStorage.removeItem(key);
  },
};

export default store;