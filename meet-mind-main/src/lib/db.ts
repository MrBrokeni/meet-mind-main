// src/lib/db.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'MeetMindDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

export interface RecordingMetadata {
  id: number; // Auto-incrementing primary key
  name: string;
  timestamp: number; // Store as Unix timestamp (milliseconds)
  duration: number; // Store duration in seconds
  blobMimeType: string;
}

export interface RecordingData extends RecordingMetadata {
  audioBlob: Blob;
}

interface MeetMindDBSchema extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: RecordingData;
    indexes: { 'timestamp': number }; // Index by timestamp for ordering
  };
}

let dbPromise: Promise<IDBPDatabase<MeetMindDBSchema>> | null = null;

const initDB = (): Promise<IDBPDatabase<MeetMindDBSchema>> => {
  if (!dbPromise) {
    dbPromise = openDB<MeetMindDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('timestamp', 'timestamp');
          console.log(`Object store "${STORE_NAME}" created.`);
        } else {
            // Handle potential future upgrades here if schema changes
            console.log(`Object store "${STORE_NAME}" already exists.`);
             const store = transaction.objectStore(STORE_NAME);
             if (!store.indexNames.contains('timestamp')) {
                 store.createIndex('timestamp', 'timestamp');
                 console.log('Created timestamp index.');
             }
        }
      },
      blocked() {
        console.error('IndexedDB blocked');
        // Potentially show a message to the user to close other tabs
      },
      blocking() {
        console.warn('IndexedDB blocking');
        // db.close(); // Close the connection if another tab is trying to upgrade
      },
      terminated() {
        console.error('IndexedDB terminated');
        dbPromise = null; // Reset promise if connection terminates
      },
    });
  }
  return dbPromise;
};

export const addRecording = async (recording: Omit<RecordingData, 'id'>): Promise<number> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const id = await store.add(recording as RecordingData); // Add the recording data
    await tx.done;
    console.log(`Recording added with ID: ${id}`);
    return id;
  } catch (error) {
    console.error('Failed to add recording:', error);
    throw new Error(`Failed to save recording: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Get only metadata for listing, sorted by timestamp descending (newest first)
export const getAllRecordingsMetadata = async (): Promise<RecordingMetadata[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp'); // Use the timestamp index
    const allData = await index.getAll(); // Get all data ordered by timestamp (ascending by default)

    // Sort descending (newest first) and map to metadata
    const metadata = allData
      .sort((a, b) => b.timestamp - a.timestamp) // Sort descending
      .map(({ audioBlob, ...meta }) => meta); // Exclude the blob

    await tx.done;
    console.log(`Retrieved ${metadata.length} recording metadata entries.`);
    return metadata;
  } catch (error) {
    console.error('Failed to get all recording metadata:', error);
    return []; // Return empty array on error
  }
};


export const getRecording = async (id: number): Promise<RecordingData | undefined> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const recording = await store.get(id);
    await tx.done;
     if (recording) {
        console.log(`Retrieved recording with ID: ${id}`);
     } else {
        console.log(`No recording found with ID: ${id}`);
     }
    return recording;
  } catch (error) {
    console.error(`Failed to get recording with ID ${id}:`, error);
    return undefined;
  }
};

export const deleteRecording = async (id: number): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.delete(id);
    await tx.done;
    console.log(`Recording deleted with ID: ${id}`);
  } catch (error) {
    console.error(`Failed to delete recording with ID ${id}:`, error);
    throw new Error(`Failed to delete recording: ${error instanceof Error ? error.message : String(error)}`);
  }
};
