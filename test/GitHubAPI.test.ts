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

    describe("fetchAllTags", () => {
        test("should forward tags returned from the GitHub API", async () => {
            const expectedTags = ["tag1", "tag2", "tag3"];
            const response = {
                data: expectedTags.map((tag) => ({
                    name: tag,
                    commit: {
                        sha: randomString()
                    }
                }))
            };

            const paginate = async (fn: any, args: any, mapper: any = (response: any) => response.data) => {
                return mapper(await fn(args), () => {});
            };

            const octokit = mock<Octokit>({
                log: {
                    debug: () => {}
                },
                paginate: paginate as any,
                rest: {
                    repos: {
                        listTags: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            const tags = await githubAPI.fetchAllTags(new RegExp(""));
            expect(tags).containSubset(expectedTags);
            expect(expectedTags).containSubset(tags);
        });
    });

    describe("fetchCommitDifference", () => {
        test("should return ahead_by if status is ahead", async () => {
            const expectedAbsoluteDifference = 4;
            const response = {
                data: {
                    status: "ahead",
                    ahead_by: expectedAbsoluteDifference
                }
            };

            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        compareCommitsWithBasehead: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            const difference = await githubAPI.fetchCommitDifference("ref1", "ref2");
            expect(difference).toBe(expectedAbsoluteDifference);
        });

        test("should return negative behind_by if status is behind", async () => {
            const expectedAbsoluteDifference = 4;
            const response = {
                data: {
                    status: "behind",
                    behind_by: expectedAbsoluteDifference
                }
            };

            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        compareCommitsWithBasehead: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            const difference = await githubAPI.fetchCommitDifference("ref1", "ref2");
            expect(difference).toBe(-expectedAbsoluteDifference);
        });

        test("should return 0 if status is identical", async () => {
            const response = {
                data: {
                    status: "identical"
                }
            };

            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        compareCommitsWithBasehead: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            const difference = await githubAPI.fetchCommitDifference("ref1", "ref2");
            expect(difference).toBe(0);
        });

        test("should return NaN if status is diverged", async () => {
            const response = {
                data: {
                    status: "diverged",
                    ahead_by: 3,
                    behind_by: 2
                }
            };

            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        compareCommitsWithBasehead: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            const difference = await githubAPI.fetchCommitDifference("ref1", "ref2");
            expect(difference).toBeNaN();
        });

        test("should throw error if ahead_by is negative", async () => {
            const response = {
                data: {
                    status: "ahead",
                    ahead_by: -1
                }
            };

            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        compareCommitsWithBasehead: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            await expect(githubAPI.fetchCommitDifference("ref1", "ref2")).rejects.toThrowError();
        });

        test("should throw error if behind_by is negative", async () => {
            const response = {
                data: {
                    status: "behind",
                    behind_by: -1
                }
            };

            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        compareCommitsWithBasehead: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            await expect(githubAPI.fetchCommitDifference("ref1", "ref2")).rejects.toThrowError();
        });

        test("should throw error on unknown status", async () => {
            const response = {
                data: {}
            };

            const octokit = mock<Octokit>({
                rest: {
                    repos: {
                        compareCommitsWithBasehead: (() => Promise.resolve(response)) as any
                    }
                }
            });

            const githubAPI = new GitHubAPI(octokit, defaultRepo);
            await expect(githubAPI.fetchCommitDifference("ref1", "ref2")).rejects.toThrowError();
        });
    });
});