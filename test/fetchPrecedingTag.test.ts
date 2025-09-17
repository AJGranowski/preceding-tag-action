import {
    describe,
    expect,
    test,
    vi
} from "vitest";

import { mock } from "vitest-mock-extended";

import type { GitHubAPI } from "../src/GitHubAPI";
import { fetchPrecedingTag } from "../src/fetchPrecedingTag";

describe("fetchPrecedingTag", () => {
    test("should return null if the repo has no tags", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve([])
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBeNull();
    });

    test("should compare each tag against the target ref", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve(["tag1", "tag2", "tag3"]),
        });

        await fetchPrecedingTag(mockGithubAPI, "HEAD");

        expect(mockGithubAPI.fetchCommitDifference).toBeCalledWith("tag1", "HEAD");
        expect(mockGithubAPI.fetchCommitDifference).toBeCalledWith("tag2", "HEAD");
        expect(mockGithubAPI.fetchCommitDifference).toBeCalledWith("tag3", "HEAD");
    });
});