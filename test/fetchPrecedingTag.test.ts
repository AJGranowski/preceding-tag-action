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

    test("should return the closest preceding tag", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve(["tag1", "tag2", "tag3"])
        });

        mockGithubAPI.fetchCommitDifference.mockImplementation((a, b) => {
            const abTable: Record<string, number> = {
                "tag1": 3,
                "tag2": 2,
                "tag3": -1
            };

            if (b === "HEAD") {
                return Promise.resolve(abTable[a] ?? NaN);
            } else if (a === "HEAD") {
                return Promise.resolve(-(abTable[b] ?? NaN));
            }

            return Promise.resolve(NaN);
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag2");
    });
});