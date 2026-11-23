const DB_NAME = 'hilyah-home-schooling';
const DB_VERSION = 1;
let dbPromise;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks');
      if (!db.objectStoreNames.contains('juz')) db.createObjectStore('juz');
      if (!db.objectStoreNames.contains('chat')) db.createObjectStore('chat', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function getValue(storeName, key, fallback = null) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result ?? fallback);
    request.onerror = () => reject(request.error);
  });
}

export async function setValue(storeName, key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value, key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function addChatMessage(role, text) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('chat', 'readwrite').objectStore('chat').add({ role, text, createdAt: Date.now() });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecentChat(limit = 8) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('chat', 'readonly').objectStore('chat').getAll();
    request.onsuccess = () => resolve(request.result.slice(-limit));
    request.onerror = () => reject(request.error);
  });
}
