import {
    describe,
    expect,
    test,
    vi
} from "vitest";

import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";

import PrecedingTagAction from "../src/PrecedingTagAction";

vi.mock("@actions/core", () => ({
    getInput: vi.fn(() => ""),
    getBooleanInput: vi.fn(() => false),
    setFailed: vi.fn(),
    setOutput: vi.fn(),
    warning: vi.fn()
}));

vi.mock("@actions/github", () => ({
    context: {
        repo: {
            owner: "",
            repo: ""
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
            compareCommitsWithBasehead: vi.fn(() => Promise.reject()),
            getCommit: vi.fn(() => Promise.reject()),
            listTags: vi.fn(() => Promise.reject())
        }
    };

    return { Octokit };
});

describe("PrecedingTagAction", () => {
    test("should fail with an unknown error if a promise rejects without an error", async () => {
        (Octokit.prototype as Octokit).rest.repos.listTags = vi.fn(() => Promise.reject()) as any;
        await PrecedingTagAction();
        expect(core.setFailed).toHaveBeenCalledExactlyOnceWith("An unknown error occurred.");
    });
});