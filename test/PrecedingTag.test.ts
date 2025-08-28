import { describe, expect, test } from "vitest";
import { mock } from "vitest-mock-extended";

import type { GitHubAPI } from "../src/GitHubAPI";
import { PrecedingTag } from "../src/PrecedingTag";

describe("PrecedingTag", () => {
    describe("fetchPrecedingTag", () => {
        test("should return null if the repo has no tags", async () => {
            const mockGithubAPI = mock<GitHubAPI>({
                fetchAllTags: () => Promise.resolve([])
            });

            const precedingTag = new PrecedingTag(mockGithubAPI);
            expect(await precedingTag.fetchPrecedingTag("HEAD")).toBeNull();
        });
    });
});