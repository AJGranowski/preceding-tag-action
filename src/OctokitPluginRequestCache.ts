import * as actionsCache from "@actions/cache";
import { ETagRequestCacheDB } from "./ETagRequestCacheDB";
import { hash } from "crypto";
import { join as pathJoin } from "path";
import { mkdir } from "fs/promises";
import type { Octokit } from "@octokit/core";
import type { OctokitResponse, RequestParameters } from "@octokit/types";

interface OctokitPluginRequestCacheOptions {
    actionsCache?: typeof actionsCache;
    enable?: boolean;
    requestCache?: ETagRequestCacheDB
}

interface OctokitPluginRequestCacheReturn {
    loadCache: (primaryKey: string, restoreKey: string) => Promise<void>;
    saveCache: (primaryKey: string) => Promise<void>;
}

const CACHE_DIR = pathJoin("/", "tmp", ".cache", "preceding-tag-action");

function mapObject(obj: Record<string, unknown>, callback: (key: string, value: unknown) => unknown): Record<string, unknown> {
    return Object.entries(obj).reduce((result, [key, value]: [string, any]) => {
        const mappedValue = callback(key, value);
        if (mappedValue !== undefined) {
            result[key] = mappedValue;
        }

        return result;
    }, {} as Record<string, unknown>);
}

function hashRequestParameters(requestParameters: RequestParameters): string {
    const headerMapper = (key: string, value: unknown): unknown => {
        if (key !== "accept") {
            return undefined;
        }

        return value;
    };

    const mediaTypeMapper = (key: string, value: unknown): unknown => {
        if (key !== "format") {
            return undefined;
        }

        return value;
    };

    const objectToHash = mapObject(requestParameters, (key, value) => {
        if (key === "request") {
            return undefined;
        }

        if (key === "headers") {
            return mapObject(value as any, headerMapper);
        }

        if (key === "mediaType") {
            return mapObject(value as any, mediaTypeMapper);
        }

        return value;
    });

    return hash("sha256", JSON.stringify(objectToHash));
}

function isNotModified(error: any): boolean {
    return error.status === 304 && error.response != null && error.response.headers != null && error.response.headers.etag != null;
}

function isSuccessResponse(response: OctokitResponse<any, any>): boolean {
    return response.status >= 200 && response.status < 300;
}

export function requestCache(octokit: Octokit, options: OctokitPluginRequestCacheOptions | any): OctokitPluginRequestCacheReturn {
    const optionsWithDefaults = {
        actionsCache: actionsCache,
        enable: true,
        requestCache: new ETagRequestCacheDB(),
        ...options as OctokitPluginRequestCacheOptions
    } satisfies Required<OctokitPluginRequestCacheOptions>;

    // Early return if disabled
    if (!optionsWithDefaults.enable) {
        return {
            loadCache: (): Promise<void> => Promise.resolve(),
            saveCache: (): Promise<void> => Promise.resolve()
        };
    }

    octokit.hook.before("request", async (options) => {
        let cacheControl = options.headers["cache-control"];
        cacheControl = cacheControl == null ? "" : cacheControl.toString();
        if (!(await optionsWithDefaults.requestCache.isOpen()) || cacheControl.includes("no-cache")) {
            return;
        }

        const requestHash = hashRequestParameters(options);
        const eTag = await optionsWithDefaults.requestCache.matchETag(requestHash);
        if (eTag != null) {
            options.headers["If-None-Match"] = eTag;
        }
    });

    octokit.hook.after("request", async (response, options) => {
        let cacheControl = options.headers["cache-control"];
        cacheControl = cacheControl == null ? "" : cacheControl.toString();
        if (!(await optionsWithDefaults.requestCache.isOpen()) || cacheControl.includes("no-store")) {
            return;
        }

        if (!isSuccessResponse(response)) {
            return;
        }

        if (response.headers.etag == null || response.headers.etag.length === 0) {
            return;
        }

        optionsWithDefaults.requestCache.put(hashRequestParameters(options), response.headers.etag, response, Date.now());
    });

    octokit.hook.error("request", async (error: any) => {
        if (!(await optionsWithDefaults.requestCache.isOpen())) {
            return;
        }

        if (!isNotModified(error)) {
            throw error;
        }

        const cachedResponse = await optionsWithDefaults.requestCache.matchResponse(error.response.headers.etag);
        if (cachedResponse == null) {
            throw new AggregateError([error], "Cache miss");
        }

        return cachedResponse.response;
    });

    return {
        async loadCache(primaryKey: string, restoreKey: string): Promise<void> {
            await mkdir(CACHE_DIR, {recursive: true});
            if (optionsWithDefaults.actionsCache.isFeatureAvailable()) {
                await optionsWithDefaults.actionsCache.restoreCache([pathJoin(CACHE_DIR, "*")], primaryKey, [restoreKey]);
            }

            await optionsWithDefaults.requestCache.open();
        },
        async saveCache(primaryKey: string): Promise<void> {
            await optionsWithDefaults.requestCache.close();
            if (optionsWithDefaults.actionsCache.isFeatureAvailable()) {
                await optionsWithDefaults.actionsCache.saveCache([pathJoin(CACHE_DIR, "*")], primaryKey);
            }
        }
    };
}