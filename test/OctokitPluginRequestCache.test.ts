import {
    beforeEach,
    describe,
    expect,
    test,
    vi
} from "vitest";
import { ETagRequestCacheDB } from "../src/ETagRequestCacheDB";
import type { Mock } from "vitest";
import { mock } from "vitest-mock-extended";
import type { Octokit } from "@octokit/rest";
import { requestCache } from "../src/OctokitPluginRequestCache";
import { DatabaseSync as SQLiteDB } from "node:sqlite";

describe("OctokitPluginRequestCache", () => {
    let actionsCache: any;
    let requestCacheDB: ETagRequestCacheDB;
    beforeEach(() => {
        actionsCache = {
            saveCache: async () => {},
            restoreCache: async () => {},
            isFeatureAvailable: () => true
        };
        requestCacheDB = new ETagRequestCacheDB(new SQLiteDB(":memory:", {open: false}));
    });

    test("plugin initialization", () => {
        const octokit = mock<Octokit>({
            hook: {} as any
        });

        requestCache(octokit, {actionsCache: actionsCache, enable: false, requestCache: requestCacheDB});
    });

    test("plugin outputs exist", () => {
        const octokit = mock<Octokit>({
            hook: {} as any
        });

        const outputs = requestCache(octokit, {actionsCache: actionsCache, enable: true, requestCache: requestCacheDB});
        expect(Object.hasOwn(outputs, "loadCache")).toBe(true);
        expect(Object.hasOwn(outputs, "saveCache")).toBe(true);
    });

    test("request hooks attached", () => {
        const octokit = mock<Octokit>({
            hook: {
                after: vi.fn(),
                before: vi.fn(),
                error: vi.fn()
            } as any
        });

        requestCache(octokit, {actionsCache: actionsCache, enable: true, requestCache: requestCacheDB});
        expect((octokit.hook.after as Mock).mock.lastCall![0]).toBe("request");
        expect((octokit.hook.before as Mock).mock.lastCall![0]).toBe("request");
        expect((octokit.hook.error as Mock).mock.lastCall![0]).toBe("request");
    });

    describe("cache", () => {
        test("should recall cache", async () => {
            const octokit = mock<Octokit>({
                hook: {
                    after: vi.fn(),
                    before: vi.fn(),
                    error: vi.fn()
                } as any
            });

            const pluginOutputs = requestCache(octokit, {actionsCache: actionsCache, enable: true, requestCache: requestCacheDB});
            const after = (octokit.hook.after as Mock).mock.lastCall![1];
            const before = (octokit.hook.before as Mock).mock.lastCall![1];
            const error = (octokit.hook.error as Mock).mock.lastCall![1];

            const request = {
                baseUrl: "url",
                headers: {
                    "ignored header": "ignored data",
                    accept: "text/html"
                },
                mediaType: {
                    format: "text/html",
                    "ignored key": "more ignored data"
                },
                request: {
                    "all of this is ignored": "none of it matters"
                }
            };

            const normalResponse = {
                status: 200,
                headers: {
                    etag: '"etag"'
                },
                data: "data"
            };

            const etagResponse = {
                status: 304,
                response: {
                    headers: normalResponse.headers
                }
            };

            await pluginOutputs.loadCache("key", "key");

            await before(request);
            await after(normalResponse, request);
            await before(request);
            const result = await error(etagResponse);

            expect(result.data).toBe("data");

            await pluginOutputs.saveCache("key");
        });

        test("should not cache cache controlled requests", async () => {
            const octokit = mock<Octokit>({
                hook: {
                    after: vi.fn(),
                    before: vi.fn(),
                    error: vi.fn()
                } as any
            });

            const pluginOutputs = requestCache(octokit, {actionsCache: actionsCache, enable: true, requestCache: requestCacheDB});
            const after = (octokit.hook.after as Mock).mock.lastCall![1];
            const before = (octokit.hook.before as Mock).mock.lastCall![1];
            const error = (octokit.hook.error as Mock).mock.lastCall![1];

            const request = {
                baseUrl: "url",
                headers: {
                    "cache-control": "no-cache,no-store"
                }
            };

            const normalResponse = {
                status: 200,
                headers: {
                    etag: '"etag"'
                },
                data: "data"
            };

            const etagResponse = {
                status: 304,
                response: {
                    headers: normalResponse.headers
                }
            };

            await pluginOutputs.loadCache("key", "key");

            await before(request);
            await after(normalResponse, request);
            await before(request);
            await expect(error(etagResponse)).rejects.toThrowError();

            await pluginOutputs.saveCache("key");
        });
    });
});