const DB_NAME = "zommy-pwa";
const DB_VERSION = 1;
const DRAFT_STORE = "drafts";
const QUEUE_STORE = "queuedMemories";
const META_STORE = "meta";

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
    if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "id" });
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const storeOperation = async (storeName, mode, operation) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const putDraft = (draft) => storeOperation(DRAFT_STORE, "readwrite", (store) => store.put({ ...draft, id: "current", updatedAt: new Date().toISOString() }));
export const getDraft = () => storeOperation(DRAFT_STORE, "readonly", (store) => store.get("current"));
export const clearDraft = () => storeOperation(DRAFT_STORE, "readwrite", (store) => store.delete("current"));

export const putQueuedMemory = (memory) => storeOperation(QUEUE_STORE, "readwrite", (store) => store.put({ ...memory, id: memory.id || `queued-${Date.now()}`, queuedAt: new Date().toISOString() }));
export const deleteQueuedMemory = (id) => storeOperation(QUEUE_STORE, "readwrite", (store) => store.delete(id));

export const getQueuedMemories = async () => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const request = transaction.objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const getQueuedCount = async () => (await getQueuedMemories()).length;

export const putMeta = (key, value) => storeOperation(META_STORE, "readwrite", (store) => store.put({ id: key, value, updatedAt: new Date().toISOString() }));
export const getMeta = (key) => storeOperation(META_STORE, "readonly", (store) => store.get(key));
