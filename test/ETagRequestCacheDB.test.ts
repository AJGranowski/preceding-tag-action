import {
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

    test("should initialize as a closed database", async () => {
        const cache = new ETagRequestCacheDB(db);
        expect(await cache.isOpen()).toBe(false);
    });
});