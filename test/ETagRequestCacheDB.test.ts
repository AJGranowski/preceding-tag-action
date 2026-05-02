import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test
} from "vitest";
import { DatabaseSync as SQLiteDB } from "node:sqlite";

import { ETagRequestCacheDB } from "../src/ETagRequestCacheDB";

describe("ETagRequestCacheDB", () => {
    let db: SQLiteDB;
    beforeEach(() => {
        db = new SQLiteDB(":memory:", {open: false});
    });

    afterEach(() => {
        if (db.isOpen) {
            db.close();
        }
    });

    test("should initialize as a closed database", async () => {
        const cache = new ETagRequestCacheDB(db);
        expect(await cache.isOpen()).toBe(false);
    });

    test("should recall ETag from request hash", async () => {
        const cache = new ETagRequestCacheDB(db);
        cache.open();
        cache.put("hash", "etag", {}, 0);
        expect(await cache.matchETag("hash")).toBe("etag");
    });

    test("should recall response from ETag", async () => {
        const cache = new ETagRequestCacheDB(db);
        cache.open();
        cache.put("hash", "etag", {data: "response"}, 1);
        expect(await cache.matchResponse("etag")).toStrictEqual({response: {data: "response"}, timestampZMS: 1});
    });

    test("should forward database open/close from underlying database", async () => {
        const cache = new ETagRequestCacheDB(db);
        expect(db.isOpen).toBe(false);
        expect(await cache.isOpen()).toBe(false);

        cache.open();
        expect(db.isOpen).toBe(true);
        expect(await cache.isOpen()).toBe(true);

        cache.close();
        expect(db.isOpen).toBe(false);
        expect(await cache.isOpen()).toBe(false);

        db.open();
        expect(db.isOpen).toBe(true);
        expect(await cache.isOpen()).toBe(true);

        db.close();
        expect(db.isOpen).toBe(false);
        expect(await cache.isOpen()).toBe(false);
    });
});