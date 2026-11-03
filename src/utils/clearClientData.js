export const clearClientData = async () => {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('offline_queue');
  } catch {
    // localStorage 不可用时忽略
  }
  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // Cache Storage 不可用时忽略
    }
  }
};

export default clearClientData;
