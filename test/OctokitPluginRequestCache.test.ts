import {
    beforeEach,
    describe,
    expect,
    test,
    vi
} from "vitest";
import type { Mock } from "vitest";
import { mock } from "vitest-mock-extended";

import { DatabaseSync as SQLiteDB } from "node:sqlite";
import type { Octokit } from "@octokit/rest";

import { ETagRequestCacheDB } from "../src/ETagRequestCacheDB";
import { requestCache } from "../src/OctokitPluginRequestCache";

describe("OctokitPluginRequestCache", () => {
    let requestCacheDB: ETagRequestCacheDB;
    beforeEach(() => {
        requestCacheDB = new ETagRequestCacheDB(new SQLiteDB(":memory:", {open: false}));
    });

    test("plugin initialization", () => {
        const octokit = mock<Octokit>({
            hook: {} as any
        });

        requestCache(octokit, {enable: true, requestCacheDB});
    });

    test("plugin outputs exist", () => {
        const octokit = mock<Octokit>({
            hook: {} as any
        });

        const outputs = requestCache(octokit, {enable: true, requestCacheDB});
        expect("loadCache" in outputs).toBe(true);
        expect("saveCache" in outputs).toBe(true);
    });

    test("request hooks attached", () => {
        const octokit = mock<Octokit>({
            hook: {
                after: vi.fn(),
                before: vi.fn(),
                error: vi.fn()
            } as any
        });

        requestCache(octokit, {enable: true, requestCacheDB});
        expect((octokit.hook.after as Mock).mock.lastCall![0]).toBe("request");
        expect((octokit.hook.before as Mock).mock.lastCall![0]).toBe("request");
        expect((octokit.hook.error as Mock).mock.lastCall![0]).toBe("request");
    });
});