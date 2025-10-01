import { DatabaseSync as SQLiteDB } from "node:sqlite";
import { join as pathJoin } from "path";

const CACHE_DIR = pathJoin("/", "tmp", ".cache", "preceding-tag-action");
const TAG_NETWORK_CACHE_FILE = "tag-network-cache.sqlite3";

/**
 * ```
 * const cache = new CacheDB();
 * cache.open();
 * cache.queryETag(listTagsRequestHash);
 * cache.queryResponse(listTagsETag); // on cache hit
 * cache.insertRequestResponse(listTags request & response); // on cache miss
 * cache.markAsTagged(sha); // on listTags response
 *
 * cache.queryETag();
 * cache.queryResponse(); // on cache hit
 * cache.insertRequestResponse(); // on cache miss
 * cache.close();
 * ```
 */
class CacheDB {
    private readonly db: SQLiteDB;

    constructor(db = new SQLiteDB(pathJoin(CACHE_DIR, TAG_NETWORK_CACHE_FILE), {open: false})) {
        this.db = db;
    }

    /**
     * Delete invalidated SHAs and cascade deletions to foreign keys.
     */
    public async close(): Promise<void> {
        this.prune();
        console.log("tag: ", this.db.prepare("SELECT * FROM tag").all());
        console.log("request_response: ", this.db.prepare("SELECT * FROM request_response").all());
        this.db.close();
    }

    /**
     * Insert a network request & response.
     */
    public async insertRequestResponse(requestHash: string, eTag: string, response: object, tagSHA1?: string, tagSHA2?: string): Promise<void> {
        const pruneExisting = this.db.prepare("DELETE FROM request_response WHERE request_hash=? OR etag=?");
        const statement = this.db.prepare("INSERT INTO request_response (request_hash, etag, response, tag_1, tag_2) VALUES (?, ?, ?, ?, ?)");
        pruneExisting.run(requestHash, eTag);
        if (tagSHA1 != null && tagSHA2 != null) {
            statement.run(requestHash, eTag, JSON.stringify(response), tagSHA1, tagSHA2);
        } else if (tagSHA1 != null) {
            statement.run(requestHash, eTag, JSON.stringify(response), tagSHA1);
        } else {
            statement.run(requestHash, eTag, JSON.stringify(response));
        }
    }

    /**
     * Identify a SHA as belonging to a tag.
     */
    public async markAsTagged(sha: string): Promise<void> {
        const statement = this.db.prepare("INSERT OR REPLACE INTO tag (sha, is_tag) VALUES (?, 1)");
        statement.run(sha);
    }

    /**
     * Open the database, initialize tables, and unmark all SHAs previously marked as tags.
     */
    public async open(): Promise<void> {
        this.db.open();
        this.initialize();
        this.unmarkAllAsTagged();
    }

    /**
     * Query the ETag related with the given request hash.
     * Returns null if an ETag does not exist.
     */
    public async queryETag(requestHash: string): Promise<string | null> {
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
    public async queryResponse(eTag: string): Promise<object | null> {
        const statement = this.db.prepare("SELECT response FROM request_response WHERE etag=? LIMIT 1");
        const result = statement.get(eTag);
        if (result == null || result["response"] == null) {
            return null;
        }

        return JSON.parse(result["response"].toString());
    }

    /**
     * Initialize tables if they don't exist.
     */
    private async initialize(): Promise<void> {
        this.db.exec("CREATE TABLE IF NOT EXISTS tag(sha TEXT NOT NULL PRIMARY KEY, is_tag INTEGER NOT NULL) STRICT");
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS request_response(" +
            "request_hash TEXT UNIQUE NOT NULL," +
            "etag TEXT UNIQUE NOT NULL," +
            "response TEXT NOT NULL," +
            "tag_1 TEXT," +
            "tag_2 TEXT," +
            "PRIMARY KEY (request_hash, etag)," +
            "FOREIGN KEY (tag_1) REFERENCES tag(sha) ON DELETE CASCADE," +
            "FOREIGN KEY (tag_2) REFERENCES tag(sha) ON DELETE CASCADE" +
            ") STRICT"
        );
    }

    /**
     * Delete all SHAs not marked as tags, and all entries referencing those SHAs.
     */
    private async prune(): Promise<void> {
        this.db.exec("DELETE FROM tag WHERE is_tag=0");
    }

    /**
     * Unmark all SHAs previously marked as tags.
     */
    private async unmarkAllAsTagged(): Promise<void> {
        this.db.exec("UPDATE tag SET is_tag=0");
    }
}

export { CacheDB };