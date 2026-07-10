import {
    beforeEach,
    describe,
    expect,
    test
} from "vitest";

import { mock } from "vitest-mock-extended";
import type { MockProxy } from "vitest-mock-extended";
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

async function* iterableToAsyncGenerator<T>(iterable: Iterable<T>): AsyncGenerator<T> {
    for (const item of iterable) {
        yield item;
    }
}

describe("fetchPrecedingTag", () => {
    let githubAPI: MockProxy<GitHubAPI>;
    beforeEach(() => {
        githubAPI = mock<GitHubAPI>();
    });

    test("should return null if no tags were found", async () => {
        githubAPI.fetchTags.mockReturnValue(iterableToAsyncGenerator([]));
        expect(await fetchPrecedingTag(githubAPI, {} as any, "HEAD", () => Promise.resolve([].values()))).toBeNull();
    });

    describe("multiple candidates, different dates", () => {
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
            test(`should return ${JSON.stringify(expectedResult)} with ${JSON.stringify(testParameters)}`, async () => {
                githubAPI.fetchTags.mockReturnValue(iterableToAsyncGenerator([
                    {name: "tag1", sha: "tag1-sha"},
                    {name: "tag2", sha: "tag2-sha"}
                ]));

                const algoReturn = [
                    {
                        name: "tag1",
                        sha: "tag1-sha",
                        commitDate: {
                            author: testParameters.tag1Author,
                            committer: testParameters.tag1Committer
                        }
                    },
                    {
                        name: "tag2",
                        sha: "tag2-sha",
                        commitDate: {
                            author: testParameters.tag2Author,
                            committer: testParameters.tag2Committer
                        }
                    }
                ];

                const algo = () => Promise.resolve(algoReturn.values());
                expect(await fetchPrecedingTag(githubAPI, {} as any, "HEAD", algo)).to.deep.include(expectedResult);
            });
        }
    });
});