import {
    beforeEach,
    describe,
    expect,
    test,
    vi
} from "vitest";

import * as core from "@actions/core";
import { context } from "@actions/github";
import { Octokit } from "@octokit/rest";

import PrecedingTagAction from "../src/PrecedingTagAction";

vi.mock("@actions/core", () => ({
    getInput: undefined,
    getBooleanInput: undefined,
    setFailed: undefined,
    setOutput: undefined,
    warning: undefined
}));

vi.mock("@actions/github", () => ({
    context: {
        repo: {
            owner: undefined,
            repo: undefined
        }
    }
}));

vi.mock("@octokit/rest", () => {
    const Octokit = vi.fn();
    (Octokit as any).plugin = vi.fn().mockReturnValue(Octokit);
    Octokit.prototype.log = {
        debug: () => {},
        error: () => {},
        info: () => {},
        warn: () => {}
    };

    Octokit.prototype.paginate = async (fn: any, args: any, mapper: any = (response: any) => response.data) => {
        return mapper(await fn(args), () => {});
    };

    Octokit.prototype.rest = {
        repos: {
            compareCommitsWithBasehead: undefined,
            getCommit: undefined,
            listTags: undefined
        }
    };

    return { Octokit };
});

describe("PrecedingTagAction", () => {
    beforeEach(() => {
        (core as any).getInput = () => {throw new Error("Not implemented.");};
        (core as any).getBooleanInput = () => {throw new Error("Not implemented.");};
        (core as any).setFailed = vi.fn();
        (core as any).setOutput = vi.fn();
        (core as any).warning = vi.fn();
        (context.repo.owner as any) = undefined;
        (context.repo.repo as any) = undefined;
        (Octokit.prototype as any).rest.repos.compareCommitsWithBasehead = () => {throw new Error("Not implemented.");};
        (Octokit.prototype as any).rest.repos.getCommit = () => {throw new Error("Not implemented.");};
        (Octokit.prototype as any).rest.repos.listTags = () => {throw new Error("Not implemented.");};
    });

    describe("no internet", () => {
        beforeEach(() => {
            (core as any).getInput = () => "";
            (core as any).getBooleanInput = () => false;
            (Octokit.prototype as Octokit).rest.repos.compareCommitsWithBasehead = vi.fn(() => Promise.reject()) as any;
            (Octokit.prototype as Octokit).rest.repos.getCommit = vi.fn(() => Promise.reject()) as any;
            (Octokit.prototype as Octokit).rest.repos.listTags = vi.fn(() => Promise.reject()) as any;
        });

        test("should fail with an unknown error if a promise rejects without an error", async () => {
            await PrecedingTagAction();
            expect(core.setFailed).toHaveBeenCalledExactlyOnceWith("An unknown error occurred.");
        });

        describe("throttling", () => {
            test("onRateLimit should return true with retry count 0", async () => {
                await PrecedingTagAction();
                const onRateLimit = (Octokit as any).mock.calls[0][0].throttle.onRateLimit;
                expect(onRateLimit(0, {}, new Octokit(), 0)).toBe(true);
            });

            test("onRateLimit should return false with retry count 999", async () => {
                await PrecedingTagAction();
                const onRateLimit = (Octokit as any).mock.calls[0][0].throttle.onRateLimit;
                expect(onRateLimit(0, {}, new Octokit(), 999)).toBe(false);
            });

            test("onRateLimit should return false with retry time 999,999", async () => {
                await PrecedingTagAction();
                const onRateLimit = (Octokit as any).mock.calls[0][0].throttle.onRateLimit;
                expect(onRateLimit(999_999, {}, new Octokit(), 0)).toBe(false);
            });

            test("onSecondaryRateLimit should return false", async () => {
                await PrecedingTagAction();
                const onSecondaryRateLimit = (Octokit as any).mock.calls[0][0].throttle.onSecondaryRateLimit;
                expect(onSecondaryRateLimit(0, {})).toBe(false);
            });
        });
    });

    test("should return default tag if zero tags returned", async () => {
        (core as any).getInput = (key: string) => ({
            "default-tag": "some-default-tag",
            "regex": "",
            "include-ref": "false",
            "ref": "",
            "repository": "owner/repo",
            "token": ""
        }[key]);
        (core as any).getBooleanInput = () => false;
        (Octokit.prototype as Octokit).rest.repos.listTags = vi.fn(() => Promise.resolve({
            data: []
        })) as any;

        await PrecedingTagAction();
        const outputs = Object.fromEntries((core.setOutput as any).mock.calls);
        expect(outputs.tag.toString()).toBe("some-default-tag");
        expect(outputs["tag-found"].toString()).toBe("false");
    });
});