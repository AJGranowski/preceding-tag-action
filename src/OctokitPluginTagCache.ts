import { hash } from "crypto";
import { join as pathJoin } from "path";
import type { Octokit } from "@octokit/core";
import type { OctokitResponse, RequestParameters } from "@octokit/types";
import { mkdir, readFile, writeFile } from "fs/promises";

import { CacheDB } from "./CacheDB";

interface OctokitPluginTagCacheOptions {
    enable?: boolean;
}

interface OctokitPluginTagCacheReturn {
    loadCache: () => Promise<void>;
    saveCache: () => Promise<void>;
}

const CACHE_DIR = pathJoin("/", "tmp", ".cache", "preceding-tag-action");
const TAG_NETWORK_CACHE_FILE = "tag-network-cache.json";

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

export function tagCache(octokit: Octokit, options: OctokitPluginTagCacheOptions | any): OctokitPluginTagCacheReturn {
    const optionsWithDefaults = {
        enable: true,
        ...options
    } satisfies Required<OctokitPluginTagCacheOptions>;

    if (!optionsWithDefaults.enable) {
        return {
            loadCache: (): Promise<void> => Promise.resolve(),
            saveCache: (): Promise<void> => Promise.resolve()
        };
    }

    const cache = new CacheDB();
    const responseHandler = (response: any): void => {
        if (response.url == null || response.data == null) {
            return;
        }

        const url = new URL(response.url);
        if (!url.pathname.endsWith("/tags")) {
            return;
        }

        response.data.forEach((obj: any) => {
            if (obj.commit.sha.length > 0) {
                cache.markAsTagged(obj.commit.sha);
            }
        });
    }

    octokit.hook.before("request", async (options) => {
        const requestHash = hashRequestParameters(options);
        const eTag = await cache.queryETag(requestHash);
        if (eTag != null) {
            options.headers["If-None-Match"] = eTag;
        }
    });

    octokit.hook.after("request", async (response, options) => {
        console.log(response, options);
        console.log("------------------");
        responseHandler(response);
        if (response.headers.etag != null) {
            const url = new URL(response.url);
            const urlSHAs = url.pathname.matchAll(/[\da-f]{40}/g).toArray().map((x) => x[0]);
            const requestHash = hashRequestParameters(options);
            cache.insertRequestResponse(requestHash, response.headers.etag, response, ...urlSHAs);
        }
    });

    octokit.hook.error("request", async (error: any) => {
        console.log(error);
        console.log("==================");
        if (error.status === 304 && error.response != null && error.response.headers != null && error.response.headers.etag != null) {
            const response = cache.queryResponse(error.response.headers.etag);
            if (response != null) {
                responseHandler(response);
                return response;
            }
        }

        throw error;
    });

    return {
        async loadCache(): Promise<void> {
            await cache.open();
        },
        async saveCache(): Promise<void> {
            await cache.close();
        }
    };
}