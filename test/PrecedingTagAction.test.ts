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
    setOutput: vi.fn()
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
    Octokit.prototype.rest = {
        git: {
            listMatchingRefs: vi.fn(() => Promise.reject())
        },
        repos: {
            compareCommitsWithBasehead: vi.fn(() => Promise.reject()),
            getCommit: vi.fn(() => Promise.reject())
        }
    };

    return { Octokit };
});

describe("PrecedingTagAction", () => {
    test("should fail with an unknown error if a promise rejects without an error", async () => {
        (Octokit.prototype as Octokit).rest.git.listMatchingRefs = vi.fn(() => Promise.reject()) as any;
        await PrecedingTagAction();
        expect(core.setFailed).toHaveBeenCalledExactlyOnceWith("An unknown error occurred.");
    });
});