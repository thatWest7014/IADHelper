const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../keys/serviceAccountKey.json');
const settings = require('../config.json');

let db;

// Initialize Firebase only if useremotedb is true
if (settings.useremotedb) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://kiadhelper-default-rtdb.firebaseio.com"
        });
    }
    db = admin.database();
}

// Path to the local database file
const localDbPath = path.join(__dirname, '../localdb.json');

/**
 * Reads the local database file and parses it into an object.
 * @returns {object} - The parsed local database.
 */
function readLocalDb() {
    const data = fs.readFileSync(localDbPath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Writes the given object to the local database file.
 * @param {object} data - The data to write to the local database.
 */
function writeLocalDb(data) {
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Get data from a specific path in the database.
 * @param {string} path - The path to the data.
 * @returns {Promise<any>} - The data at the specified path.
 */
async function getData(path) {
    if (settings.useremotedb) {
        try {
            const snapshot = await db.ref(path).once('value');
            const value = snapshot.val();

            if (value === null) {
                console.warn(`Warning: No data found at path "${path}"`);
                return null;
            }

            return value; // Return the data as-is
        } catch (error) {
            console.error(`Error getting data from path "${path}":`, error.message);
            throw error;
        }
    } else {
        const localDb = readLocalDb();
        const keys = path.split('/');
        let value = localDb;

        for (const key of keys) {
            value = value[key];
            if (value === undefined) {
                console.warn(`Warning: No data found at path "${path}"`);
                return null;
            }
        }

        return value;
    }
}

/**
 * Set data at a specific path in the database.
 * @param {string} path - The exact path to set data.
 * @param {any} data - The data to store.
 * @returns {Promise<void>}
 */
async function setData(path, data) {
    if (settings.useremotedb) {
        try {
            await db.ref(path).set(data); // Store the data as-is
        } catch (error) {
            console.error(`Error setting data at path "${path}":`, error.message);
            throw error;
        }
    } else {
        const localDb = readLocalDb();
        const keys = path.split('/');
        let current = localDb;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) current[key] = {};
            current = current[key];
        }

        current[keys[keys.length - 1]] = data;
        writeLocalDb(localDb);
    }
}

/**
 * Update specific fields at a given path in the database.
 * @param {string} path - The path to update data.
 * @param {object} updates - An object containing key-value pairs to update.
 * @returns {Promise<void>}
 */
async function updateData(path, updates) {
    if (settings.useremotedb) {
        try {
            await db.ref(path).update(updates); // Update the data as-is
        } catch (error) {
            console.error(`Error updating data at path "${path}":`, error.message);
            throw error;
        }
    } else {
        const localDb = readLocalDb();
        const keys = path.split('/');
        let current = localDb;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) current[key] = {};
            current = current[key];
        }

        const lastKey = keys[keys.length - 1];
        current[lastKey] = { ...current[lastKey], ...updates };
        writeLocalDb(localDb);
    }
}

/**
 * Remove data at a specific path in the database.
 * @param {string} path - The path to remove data.
 * @returns {Promise<void>}
 */
async function removeData(path) {
    if (settings.useremotedb) {
        try {
            await db.ref(path).remove();
        } catch (error) {
            console.error(`Error removing data at path "${path}":`, error.message);
            throw error;
        }
    } else {
        const localDb = readLocalDb();
        const keys = path.split('/');
        let current = localDb;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) return; // Path doesn't exist
            current = current[key];
        }

        delete current[keys[keys.length - 1]];
        writeLocalDb(localDb);
    }
}

module.exports = {
    getData,
    setData,
    updateData,
    removeData
};
