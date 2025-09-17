import { describe, expect, test } from "vitest";
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
            fetchAllTags: () => Promise.resolve(["tag1", "tag2", "tag3"])
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

    test("should return the latest commit date of equal distance tags", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve(["tag1", "tag2"])
        });

        mockGithubAPI.fetchCommitDifference.mockResolvedValue(2);
        mockGithubAPI.fetchCommitDate.mockImplementation((tag) => {
            const committerCommitDate = ({
                "tag1": "2025-09-10T03:37:12Z",
                "tag2": "2025-09-09T06:23:06Z"
            })[tag] ?? "1980-01-01T00:00:00Z";

            return Promise.resolve({
                committer: committerCommitDate
            });
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag1");

        mockGithubAPI.fetchCommitDate.mockImplementation((tag) => {
            const committerCommitDate = ({
                "tag1": "2025-09-09T06:23:06Z",
                "tag2": "2025-09-10T03:37:12Z"
            })[tag];

            return Promise.resolve({
                committer: committerCommitDate
            });
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag2");

        mockGithubAPI.fetchCommitDate.mockImplementation((tag) => {
            const authorCommitDate = ({
                "tag1": "2025-09-01T14:12:54Z",
                "tag2": "2025-09-02T23:25:37Z"
            })[tag];

            return Promise.resolve({
                author: authorCommitDate
            });
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag2");

        mockGithubAPI.fetchCommitDate.mockImplementation((tag) => {
            const authorCommitDate = ({
                "tag1": "2025-09-02T23:25:37Z",
                "tag2": "2025-09-01T14:12:54Z"
            })[tag];

            return Promise.resolve({
                author: authorCommitDate
            });
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag1");

        mockGithubAPI.fetchCommitDate.mockImplementation((tag) => {
            const committerCommitDate = ({
                "tag1": "2025-08-14T01:02:03Z"
            })[tag];

            return Promise.resolve({
                committer: committerCommitDate
            });
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag1");

        mockGithubAPI.fetchCommitDate.mockImplementation((tag) => {
            const committerCommitDate = ({
                "tag2": "2025-08-14T01:02:03Z"
            })[tag];

            return Promise.resolve({
                committer: committerCommitDate
            });
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag2");
    });

    test("should return something for basically equal tags", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve(["tag1", "tag2"])
        });

        mockGithubAPI.fetchCommitDifference.mockResolvedValue(3);
        mockGithubAPI.fetchCommitDate.mockResolvedValue({});

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).not.toBeNull();
    });

    test("should not include tags pointing to this ref if includeRef is false", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve(["tag1", "tag2", "tag3"])
        });

        mockGithubAPI.fetchCommitDifference.mockImplementation((a, b) => {
            const abTable: Record<string, number> = {
                "tag1": -1,
                "tag2": 0,
                "tag3": 1
            };

            if (b === "HEAD") {
                return Promise.resolve(abTable[a] ?? NaN);
            } else if (a === "HEAD") {
                return Promise.resolve(-(abTable[b] ?? NaN));
            }

            return Promise.resolve(NaN);
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBe("tag3");
    });

    test("should include tags pointing to this ref if includeRef is true", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve(["tag1", "tag2", "tag3"])
        });

        mockGithubAPI.fetchCommitDifference.mockImplementation((a, b) => {
            const abTable: Record<string, number> = {
                "tag1": -1,
                "tag2": 0,
                "tag3": 1
            };

            if (b === "HEAD") {
                return Promise.resolve(abTable[a] ?? NaN);
            } else if (a === "HEAD") {
                return Promise.resolve(-(abTable[b] ?? NaN));
            }

            return Promise.resolve(NaN);
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD", {includeRef: true})).toBe("tag2");
    });
});