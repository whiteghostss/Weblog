const DB_NAME = 'LeleoWallhavenDB';
const DB_VERSION = 1;
const STORE_NAME = 'favorites';

export const db = {
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => reject(event.target.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('url', 'url', { unique: true });
          store.createIndex('addedAt', 'addedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
    });
  },

  async addFavorite(item) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Check if exists
      const urlIndex = store.index('url');
      const checkRequest = urlIndex.get(item.url);
      
      checkRequest.onsuccess = () => {
        if (checkRequest.result) {
          resolve({ status: 'exists', id: checkRequest.result.id });
        } else {
          const request = store.add({
            ...item,
            addedAt: new Date().getTime()
          });
          request.onsuccess = (event) => resolve({ status: 'success', id: event.target.result });
          request.onerror = (event) => reject(event.target.error);
        }
      };
      
      checkRequest.onerror = (event) => reject(event.target.error);
    });
  },

  async removeFavorite(url) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('url');
      
      const keyRequest = index.getKey(url);
      
      keyRequest.onsuccess = () => {
        if (keyRequest.result) {
          const deleteRequest = store.delete(keyRequest.result);
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = (event) => reject(event.target.error);
        } else {
          resolve(false);
        }
      };
      
      keyRequest.onerror = (event) => reject(event.target.error);
    });
  },

  async getAllFavorites() {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  },
  
  async isFavorite(url) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
       const transaction = database.transaction([STORE_NAME], 'readonly');
       const store = transaction.objectStore(STORE_NAME);
       const index = store.index('url');
       const request = index.get(url);
       
       request.onsuccess = () => resolve(!!request.result);
       request.onerror = (event) => reject(event.target.error);
    });
  }
};
