import * as actionsCache from "@actions/cache";
import { hash } from "crypto";
import { join as pathJoin } from "path";
import type { Octokit } from "@octokit/core";
import type { RequestParameters } from "@octokit/types";

import { ETagRequestCacheDB } from "./ETagRequestCacheDB";

interface OctokitPluginRequestCacheOptions {
    enable?: boolean;
}

interface OctokitPluginRequestCacheReturn {
    loadCache: (key: string) => Promise<void>;
    saveCache: (key: string) => Promise<void>;
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

export function requestCache(octokit: Octokit, options: OctokitPluginRequestCacheOptions | any): OctokitPluginRequestCacheReturn {
    const optionsWithDefaults = {
        enable: true,
        ...options
    } satisfies Required<OctokitPluginRequestCacheOptions>;

    // Early return if disabled
    if (!optionsWithDefaults.enable) {
        return {
            loadCache: (): Promise<void> => Promise.resolve(),
            saveCache: (): Promise<void> => Promise.resolve()
        };
    }

    const requestCache = new ETagRequestCacheDB();

    octokit.hook.before("request", async (options) => {
        let cacheControl = options.headers["cache-control"];
        cacheControl = cacheControl == null ? "" : cacheControl.toString();
        if (cacheControl.includes("no-cache")) {
            return;
        }

        const requestHash = hashRequestParameters(options);
        const eTag = await requestCache.matchETag(requestHash);
        if (eTag != null) {
            options.headers["If-None-Match"] = eTag;
        }
    });

    octokit.hook.after("request", async (response, options) => {
        let cacheControl = options.headers["cache-control"];
        cacheControl = cacheControl == null ? "" : cacheControl.toString();
        if (cacheControl.includes("no-store")) {
            return;
        }

        console.log(response, options);
        console.log("------------------");
        if (response.headers.etag != null) {
            const requestHash = hashRequestParameters(options);
            requestCache.put(requestHash, response.headers.etag, response, Date.now());
        }
    });

    octokit.hook.error("request", async (error: any) => {
        console.log(error);
        console.log("==================");
        if (error.status === 304 && error.response != null && error.response.headers != null && error.response.headers.etag != null) {
            const cachedResponse = await requestCache.matchResponse(error.response.headers.etag);
            if (cachedResponse != null) {
                return cachedResponse.response;
            }
        }

        throw error;
    });

    return {
        async loadCache(key: string): Promise<void> {
            await actionsCache.restoreCache([pathJoin(CACHE_DIR, "*")], key);
            await requestCache.open();
        },
        async saveCache(key: string): Promise<void> {
            await requestCache.close();
            await actionsCache.saveCache([pathJoin(CACHE_DIR, "*")], key);
        }
    };
}