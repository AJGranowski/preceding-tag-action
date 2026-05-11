import { DatabaseSync as SQLiteDB } from "node:sqlite";
import type { SQLOutputValue } from "node:sqlite";
import { join as pathJoin } from "path";

import type { CachedResponse } from "./types/CachedResponse";

const CACHE_DIR = pathJoin("/", "tmp", ".cache", "preceding-tag-action");
const REQUEST_CACHE_FILE = "request-cache.sqlite3";

/**
 * ```
 * const cache = new CacheDB();
 * cache.open();
 * cache.queryETag(...);
 * cache.queryResponse(...); // on cache hit
 * cache.insertRequestResponse(...); // on cache miss
 * cache.close();
 * ```
 */
class ETagRequestCacheDB {
    private readonly db: SQLiteDB;

    constructor(db = new SQLiteDB(pathJoin(CACHE_DIR, REQUEST_CACHE_FILE), {open: false})) {
        this.db = db;
    }

    /**
     * Close the database.
     */
    async close(): Promise<void> {
        this.db.close();
    }

    /**
     * Check if the database is open.
     * The database needs to be open to perform most actions.
     */
    async isOpen(): Promise<boolean> {
        return this.db.isOpen;
    }

    /**
     * Query the ETag related with the given request hash.
     * Returns null if an ETag does not exist.
     */
    async matchETag(requestHash: string): Promise<string | null> {
        const statement = this.db.prepare("SELECT etag FROM request_response WHERE request_hash=? LIMIT 1");
        const result = statement.get(requestHash);
        if (result == null || result["etag"] == null) {
            return null;
        }

        return result["etag"].toString();
    }

    /**
     * Query the cached response associated with the given ETag.
     * Returns null if a cached response does not exist.
     */
    async matchResponse(eTag: string): Promise<CachedResponse | null> {
        const statement = this.db.prepare("SELECT response, timestamp_z_ms FROM request_response WHERE etag IN (?1, 'W/' || ?1) LIMIT 1");
        const result = statement.get(eTag);
        if (result == null || result["response"] == null || result["timestamp_z_ms"] == null) {
            return null;
        }

        return {
            timestampZMS: this.sqlOutputValueToInteger(result["timestamp_z_ms"])!,
            response: JSON.parse(result["response"].toString())
        };
    }

    /**
     * Open the database and initialize tables.
     */
    async open(): Promise<void> {
        this.db.open();
        this.initialize();
    }

    /**
     * Insert a network request & response.
     */
    async put(requestHash: string, eTag: string, response: object, timestampZMS: number): Promise<void> {
        const pruneExisting = this.db.prepare("DELETE FROM request_response WHERE request_hash=? OR etag IN (?2, 'W/' || ?2)");
        const statement = this.db.prepare("INSERT INTO request_response (request_hash, etag, response, timestamp_z_ms) VALUES (?, ?, ?, ?)");
        pruneExisting.run(requestHash, eTag);
        statement.run(requestHash, eTag, JSON.stringify(response), Math.round(timestampZMS));
    }

    /**
     * Initialize tables if they don't exist.
     */
    private async initialize(): Promise<void> {
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS request_response(" +
            "request_hash TEXT UNIQUE NOT NULL," +
            "etag TEXT UNIQUE NOT NULL," +
            "response TEXT NOT NULL," +
            "timestamp_z_ms INTEGER NOT NULL," +
            "PRIMARY KEY (request_hash, etag)" +
            ") STRICT"
        );
    }

    /**
     * Parse the SQL Output into a JavaScript primitive
     */
    private sqlOutputValueToInteger(value: Exclude<SQLOutputValue, null>): number {
        if (typeof value === "number") {
            return value;
        }

        if (typeof value === "string") {
            const result = Number.parseFloat(value);
            if (result.toString() === value) {
                return result;
            }
        }

        throw new TypeError(`Unexpected type "${typeof value}" returned by SQLite`);
    }
}

export { ETagRequestCacheDB };