import { describe, expect, test } from "vitest";
import { mock } from "vitest-mock-extended";

import type { GitHubAPI } from "../src/GitHubAPI";
import { fetchPrecedingTag } from "../src/fetchPrecedingTag";
import type { Tag } from "../src/types/Tag";

interface TestParameter {
    tag1Author?: string;
    tag1Committer?: string;
    tag2Author?: string;
    tag2Committer?: string;
}

interface GenerateTestParameterSetOptions {
    tag1Authors: (string | undefined)[];
    tag1Committers: (string | undefined)[];
    tag2Authors: (string | undefined)[];
    tag2Committers: (string | undefined)[];
}

function generateTestParameterSet(options: GenerateTestParameterSetOptions): Set<TestParameter> {
    const result = new Set<TestParameter>();
    /* eslint-disable max-depth */
    for (const tag1Author of options.tag1Authors) {
        for (const tag1Committer of options.tag1Committers) {
            for (const tag2Author of options.tag2Authors) {
                for (const tag2Committer of options.tag2Committers) {
                    result.add({
                        tag1Author: tag1Author,
                        tag1Committer: tag1Committer,
                        tag2Author: tag2Author,
                        tag2Committer: tag2Committer
                    });
                }
            }
        }
    }
    /* eslint-enable max-depth */

    return result;
}

function makeFetchCommitDifferenceProcedure(target: string, differences: Record<string, number>): (a: string, b: string) => Promise<number> {
    return (a: string, b: string) => {
        if (b === target) {
            return Promise.resolve(differences[a] ?? NaN);
        } else if (a === target) {
            return Promise.resolve(-(differences[b] ?? NaN));
        }

        throw new Error(`Neither compared tags match the target tag ${target}`);
    };
}

function randomString(): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

describe("fetchPrecedingTag", () => {
    test("should return null if the repo has no tags", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve([])
        });

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toBeNull();
    });

    test("should compare each tag against the target ref", async () => {
        const tags = [{
            name: "tag1",
            sha: randomString()
        },
        {
            name: "tag2",
            sha: randomString()
        },
        {
            name: "tag3",
            sha: randomString()
        }];

        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve(tags),
            fetchCommitSHA: (x) => Promise.resolve(x)
        });

        await fetchPrecedingTag(mockGithubAPI, "HEAD");

        const nonHeadArgs = [];
        for (const call of mockGithubAPI.fetchCommitDifference.mock.calls) {
            expect(call.length === 2);
            expect(call).contains("HEAD");
            if (call[0] === "HEAD") {
                nonHeadArgs.push(call[1]);
            } else {
                nonHeadArgs.push(call[0]);
            }
        }

        const tagSHAs = tags.map((x) => x.sha);
        expect(nonHeadArgs).containSubset(tagSHAs);
        expect(tagSHAs).containSubset(nonHeadArgs);
    });

    test("should return the closest preceding tag", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve([{
                name: "tag1",
                sha: "tag1-sha"
            },
            {
                name: "tag2",
                sha: "tag2-sha"
            },
            {
                name: "tag3",
                sha: "tag3-sha"
            }]),
            fetchCommitSHA: (x) => Promise.resolve(x)
        });

        mockGithubAPI.fetchCommitDifference.mockImplementation(makeFetchCommitDifferenceProcedure("HEAD", {
            "tag1-sha": 3,
            "tag2-sha": 2,
            "tag3-sha": -1
        }));

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toStrictEqual({
            name: "tag2",
            sha: "tag2-sha"
        });
    });

    describe("same commit difference, different dates", () => {
        const olderDate = "2025-09-09T06:23:06Z";
        const earlierDate = "2025-09-10T03:37:12Z";
        const tests = new Map<TestParameter, Tag>();
        let tag1WinsSet = new Set<TestParameter>();
        let tag2WinsSet = new Set<TestParameter>();

        tag1WinsSet = tag1WinsSet.union(generateTestParameterSet({
            tag1Authors: [earlierDate, olderDate, undefined],
            tag1Committers: [earlierDate],
            tag2Authors: [earlierDate, olderDate, undefined],
            tag2Committers: [olderDate, undefined]
        }));

        tag1WinsSet = tag1WinsSet.union(generateTestParameterSet({
            tag1Authors: [earlierDate, olderDate, undefined],
            tag1Committers: [olderDate],
            tag2Authors: [earlierDate, olderDate, undefined],
            tag2Committers: [undefined]
        }));

        tag1WinsSet = tag1WinsSet.union(generateTestParameterSet({
            tag1Authors: [earlierDate],
            tag1Committers: [undefined],
            tag2Authors: [olderDate, undefined],
            tag2Committers: [undefined]
        }));

        tag2WinsSet = tag2WinsSet.union(generateTestParameterSet({
            tag1Authors: [earlierDate, olderDate, undefined],
            tag1Committers: [olderDate, undefined],
            tag2Authors: [earlierDate, olderDate, undefined],
            tag2Committers: [earlierDate]
        }));

        tag2WinsSet = tag2WinsSet.union(generateTestParameterSet({
            tag1Authors: [earlierDate, olderDate, undefined],
            tag1Committers: [undefined],
            tag2Authors: [earlierDate, olderDate, undefined],
            tag2Committers: [olderDate]
        }));

        tag2WinsSet = tag2WinsSet.union(generateTestParameterSet({
            tag1Authors: [olderDate, undefined],
            tag1Committers: [undefined],
            tag2Authors: [earlierDate],
            tag2Committers: [undefined]
        }));

        for (const testParameter of tag1WinsSet.values()) {
            tests.set(testParameter, {
                name: "tag1",
                sha: "tag1-sha"
            });
        }

        for (const testParameter of tag2WinsSet.values()) {
            tests.set(testParameter, {
                name: "tag2",
                sha: "tag2-sha"
            });
        }

        for (const testEntry of tests.entries()) {
            const testParameters = testEntry[0];
            const expectedResult = testEntry[1];
            test(`should return ${expectedResult} with ${JSON.stringify(testParameters)}`, async () => {
                const mockGithubAPI = mock<GitHubAPI>({
                    fetchAllTags: () => Promise.resolve([{
                        name: "tag1",
                        sha: "tag1-sha"
                    },
                    {
                        name: "tag2",
                        sha: "tag2-sha"
                    }]),
                    fetchCommitSHA: (x) => Promise.resolve(x)
                });

                const commitDates = {
                    "tag1-sha": {
                        author: testParameters.tag1Author,
                        committer: testParameters.tag1Committer
                    },
                    "tag2-sha": {
                        author: testParameters.tag2Author,
                        committer: testParameters.tag2Committer
                    }
                };

                mockGithubAPI.fetchCommitDifference.mockResolvedValue(1);
                mockGithubAPI.fetchCommitDate.mockImplementation((tagSha) => {
                    if (!(tagSha in commitDates)) {
                        return Promise.reject();
                    }

                    return Promise.resolve(commitDates[tagSha as keyof typeof commitDates]);
                });

                expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toStrictEqual(expectedResult);
            });
        }
    });

    test("should return non-null for equivalent tags", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve([{
                name: "tag1",
                sha: randomString()
            },
            {
                name: "tag2",
                sha: randomString()
            }]),
            fetchCommitSHA: (x) => Promise.resolve(x)
        });

        mockGithubAPI.fetchCommitDifference.mockResolvedValue(3);
        mockGithubAPI.fetchCommitDate.mockResolvedValue({});

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).not.toBeNull();
    });

    test("should not include tags pointing to this ref if includeRef is false", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve([{
                name: "tag1",
                sha: "tag1-sha"
            },
            {
                name: "tag2",
                sha: "tag2-sha"
            },
            {
                name: "tag3",
                sha: "tag3-sha"
            }]),
            fetchCommitSHA: (x) => Promise.resolve(x)
        });

        mockGithubAPI.fetchCommitDifference.mockImplementation(makeFetchCommitDifferenceProcedure("HEAD", {
            "tag1-sha": -1,
            "tag2-sha": 0,
            "tag3-sha": 1
        }));

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD")).toStrictEqual({
            name: "tag3",
            sha: "tag3-sha"
        });
    });

    test("should include tags pointing to this ref if includeRef is true", async () => {
        const mockGithubAPI = mock<GitHubAPI>({
            fetchAllTags: () => Promise.resolve([{
                name: "tag1",
                sha: "tag1-sha"
            },
            {
                name: "tag2",
                sha: "tag2-sha"
            },
            {
                name: "tag3",
                sha: "tag3-sha"
            }]),
            fetchCommitSHA: (x) => Promise.resolve(x)
        });

        mockGithubAPI.fetchCommitDifference.mockImplementation(makeFetchCommitDifferenceProcedure("HEAD", {
            "tag1-sha": -1,
            "tag2-sha": 0,
            "tag3-sha": 1
        }));

        expect(await fetchPrecedingTag(mockGithubAPI, "HEAD", {includeRef: true})).toStrictEqual({
            name: "tag2",
            sha: "tag2-sha"
        });
    });
});