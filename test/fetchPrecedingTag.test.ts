import { describe, expect, test } from "vitest";
import { mock } from "vitest-mock-extended";

import type { GitHubAPI } from "../src/GitHubAPI";
import { fetchPrecedingTag } from "../src/fetchPrecedingTag";

describe("PrecedingTag", () => {
    describe("fetchPrecedingTag", () => {
        test("should return null if the repo has no tags", async () => {
            const mockGithubAPI = mock<GitHubAPI>({
                fetchAllTags: () => Promise.resolve([])
            });

            expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBeNull();
        });
    });
});