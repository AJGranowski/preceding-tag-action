import {
    beforeAll,
    describe,
    expect,
    test
} from "vitest";
import { DatabaseSync as SQLiteDB } from "node:sqlite";

import { ETagRequestCacheDB } from "../src/ETagRequestCacheDB";

describe("ETagRequestCacheDB", () => {
    let db: SQLiteDB;
    beforeAll(() => {
        db = new SQLiteDB(":memory:", {open: false});
    });

    test("should initialize as a closed database", async () => {
        const cache = new ETagRequestCacheDB(db);
        expect(await cache.isOpen()).toBe(false);
    });
});