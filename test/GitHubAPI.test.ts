import { describe, expect, test } from "vitest";
import { mock } from "vitest-mock-extended";

import type { Octokit } from "@octokit/rest";

import type { CommitDate } from "../src/types/CommitDate";
import { GitHubAPI } from "../src/GitHubAPI";
import type { Repository } from "../src/types/Repository";

const defaultRepo = {
    owner: "AJGranowski",
    repo: "preceding-tag-action"
} satisfies Repository;

function randomString(): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

describe("GitHubAPI", () => {
    describe("fetchCommitDate", () => {
        test("should forward the author and committer date from the GitHub API", async () => {
            const expectedAuthor = randomString();
            const expectedComitter = randomString();
            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        getCommit: (() => Promise.resolve({
                            data: {
                                commit: {
                                    author: {
                                        date: expectedAuthor
                                    },
                                    committer: {
                                        date: expectedComitter
                                    }
                                }
                            }
                        })) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);

            const commitDate: CommitDate = await githubAPI.fetchCommitDate("HEAD");
            expect(commitDate.author).toBe(expectedAuthor);
            expect(commitDate.committer).toBe(expectedComitter);
        });
    });
});