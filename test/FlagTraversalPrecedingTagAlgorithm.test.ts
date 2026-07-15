import {
    beforeEach,
    describe,
    expect,
    test
} from "vitest";
import type { GitHubAPI } from "../src/GitHubAPI";
import { makeFlagTraversalPrecedingTagAlgorithm } from "../src/flagTraversalPrecedingTagAlgorithm";
import { mock } from "vitest-mock-extended";
import type { MockProxy } from "vitest-mock-extended";
import type { TopologicalPrecedingTagAlgorithm } from "../src/types/TopologicalPrecedingTagAlgorithm";

async function* iterableToAsyncGenerator<T>(iterable: Iterable<T>): AsyncGenerator<T> {
    yield* iterable;
}

describe("FlagTraversalPrecedingTagAlgorithm", () => {
    describe("generator", () => {
        test("should throw error if the tags limit is too high", () => {
            expect(() => makeFlagTraversalPrecedingTagAlgorithm(100, Number.MAX_SAFE_INTEGER)).toThrowError();
        });
    });

    describe("unconstrained traversal", () => {
        let flagTraversalPrecedingTagAlgorithm: TopologicalPrecedingTagAlgorithm;
        let githubAPI: MockProxy<GitHubAPI>;
        beforeEach(() => {
            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(200, 6);
            githubAPI = mock<GitHubAPI>();
        });

        test("should return nothing if there are no tags", async () => {
            const result = await flagTraversalPrecedingTagAlgorithm("commit", [].values(), false, githubAPI);
            expect(result).to.be.empty;
        });

        describe("includeHeadCommitSHA", () => {
            const tags = [
                {name: "a", sha: "1"},
                {name: "b", sha: "2"}
            ];

            beforeEach(() => {
                githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                    {sha: "1", commitDate: {}, parentSHAs: ["2"]},
                    {sha: "2", commitDate: {}, parentSHAs: []}
                ]));
            });

            test("should return the first preceding tag that's not the starting commit if includeHeadCommitSHA is false", async () => {
                const result = await flagTraversalPrecedingTagAlgorithm("1", tags.values(), false, githubAPI);
                expect([...result]).toEqual([{name: "b", sha: "2", commitDate: {}}]);
            });

            test("should return the first preceding tag that's the starting commit if includeHeadCommitSHA is true", async () => {
                const result = await flagTraversalPrecedingTagAlgorithm("1", tags.values(), true, githubAPI);
                expect([...result]).toEqual([{name: "a", sha: "1", commitDate: {}}]);
            });
        });

        test("of unrelated tags, should return tags with the shortest distance", async () => {
            const tags = [
                {name: "a", sha: "a1"},
                {name: "b", sha: "b2"}
            ];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "0", commitDate: {}, parentSHAs: ["a1", "b1"]},
                {sha: "a1", commitDate: {}, parentSHAs: []},
                {sha: "b1", commitDate: {}, parentSHAs: ["b2"]},
                {sha: "b2", commitDate: {}, parentSHAs: []}
            ]));

            const result = await flagTraversalPrecedingTagAlgorithm("0", tags.values(), true, githubAPI);
            expect([...result]).toEqual([{name: "a", sha: "a1", commitDate: {}}]);
        });

        test("of unrelated tags, should return both tags if they're the same distance", async () => {
            const tags = [
                {name: "a", sha: "a1"},
                {name: "b", sha: "b1"}
            ];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "0", commitDate: {}, parentSHAs: ["a1", "b1"]},
                {sha: "a1", commitDate: {}, parentSHAs: []},
                {sha: "b1", commitDate: {}, parentSHAs: []}
            ]));

            const result = await flagTraversalPrecedingTagAlgorithm("0", tags.values(), true, githubAPI);
            expect([...result]).to.have.deep.members([
                {name: "a", sha: "a1", commitDate: {}},
                {name: "b", sha: "b1", commitDate: {}}
            ]);
        });

        test("should return tag with no tagged descendants, even if it has a higher depth", async () => {
            //      a1 --------------
            //   🡕                    🡖
            // 0 🡒 b1 🡒 b2 🡒 b3(b) 🡒 c1(c) 🡒 c2
            const tags = [
                {name: "b", sha: "b3"},
                {name: "c", sha: "c1"}
            ];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "0", commitDate: {}, parentSHAs: ["a1", "b1"]},
                {sha: "a1", commitDate: {}, parentSHAs: ["c1"]},
                {sha: "b1", commitDate: {}, parentSHAs: ["b2"]},
                {sha: "b2", commitDate: {}, parentSHAs: ["b3"]},
                {sha: "b3", commitDate: {}, parentSHAs: ["c1"]},
                {sha: "c1", commitDate: {}, parentSHAs: ["c2"]},
                {sha: "c2", commitDate: {}, parentSHAs: []}
            ]));

            const result = await flagTraversalPrecedingTagAlgorithm("0", tags.values(), true, githubAPI);
            expect([...result]).toEqual([{name: "b", sha: "b3", commitDate: {}}]);
        });

        test("should handle visited nodes", async () => {
            //      a1
            //   🡕     🡖
            // 0 🡒 b1 🡒 c1 🡒 c2 🡒 c3(tag)
            const tags = [{name: "tag", sha: "c3"}];
            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "0", commitDate: {}, parentSHAs: ["a1", "b1"]},
                {sha: "a1", commitDate: {}, parentSHAs: ["c1"]},
                {sha: "b1", commitDate: {}, parentSHAs: ["c1"]},
                {sha: "c1", commitDate: {}, parentSHAs: ["c2"]},
                {sha: "c2", commitDate: {}, parentSHAs: ["c3"]},
                {sha: "c3", commitDate: {}, parentSHAs: []}
            ]));

            const result = await flagTraversalPrecedingTagAlgorithm("0", tags.values(), true, githubAPI);
            expect([...result]).toEqual([{name: "tag", sha: "c3", commitDate: {}}]);
        });
    });

    describe("constrained traversal", () => {
        let flagTraversalPrecedingTagAlgorithm: TopologicalPrecedingTagAlgorithm;
        let githubAPI: MockProxy<GitHubAPI>;
        beforeEach(() => {
            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(200, 6);
            githubAPI = mock<GitHubAPI>();
        });

        test("if the commit limit is zero, should not find the tagged starting commit", async () => {
            const tags = [{name: "tag", sha: "1"}];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "1", commitDate: {}, parentSHAs: ["2"]},
                {sha: "2", commitDate: {}, parentSHAs: ["3"]},
                {sha: "3", commitDate: {}, parentSHAs: ["4"]},
                {sha: "4", commitDate: {}, parentSHAs: ["5"]},
                {sha: "5", commitDate: {}, parentSHAs: []}
            ]));

            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(0, 6);
            const result = await flagTraversalPrecedingTagAlgorithm("1", tags.values(), true, githubAPI);
            expect([...result]).to.be.empty;
        });

        test("if commit limit is one, should find the tagged starting commit", async () => {
            const tags = [{name: "tag", sha: "1"}];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "1", commitDate: {}, parentSHAs: ["2"]},
                {sha: "2", commitDate: {}, parentSHAs: ["3"]},
                {sha: "3", commitDate: {}, parentSHAs: ["4"]},
                {sha: "4", commitDate: {}, parentSHAs: ["5"]},
                {sha: "5", commitDate: {}, parentSHAs: []}
            ]));

            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(1, 6);
            const result = await flagTraversalPrecedingTagAlgorithm("1", tags.values(), true, githubAPI);
            expect([...result]).toEqual([{name: "tag", sha: "1", commitDate: {}}]);
        });

        test("if commit limit is one, should not find the tagged parent of the starting commit", async () => {
            const tags = [{name: "tag", sha: "2"}];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "1", commitDate: {}, parentSHAs: ["2"]},
                {sha: "2", commitDate: {}, parentSHAs: ["3"]},
                {sha: "3", commitDate: {}, parentSHAs: ["4"]},
                {sha: "4", commitDate: {}, parentSHAs: ["5"]},
                {sha: "5", commitDate: {}, parentSHAs: []}
            ]));

            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(1, 6);
            const result = await flagTraversalPrecedingTagAlgorithm("1", tags.values(), true, githubAPI);
            expect([...result]).to.be.empty;
        });

        test("if tag limit is zero, should find the tagged starting commit", async () => {
            const tags = [{name: "tag", sha: "1"}];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "1", commitDate: {}, parentSHAs: ["2"]},
                {sha: "2", commitDate: {}, parentSHAs: ["3"]},
                {sha: "3", commitDate: {}, parentSHAs: ["4"]},
                {sha: "4", commitDate: {}, parentSHAs: ["5"]},
                {sha: "5", commitDate: {}, parentSHAs: []}
            ]));

            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(100, 0);
            const result = await flagTraversalPrecedingTagAlgorithm("1", tags.values(), true, githubAPI);
            expect([...result]).toEqual([{name: "tag", sha: "1", commitDate: {}}]);
        });

        test("if tag limit is zero, should not find the tagged parent of the starting commit", async () => {
            const tags = [{name: "tag", sha: "2"}];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "1", commitDate: {}, parentSHAs: ["2"]},
                {sha: "2", commitDate: {}, parentSHAs: ["3"]},
                {sha: "3", commitDate: {}, parentSHAs: ["4"]},
                {sha: "4", commitDate: {}, parentSHAs: ["5"]},
                {sha: "5", commitDate: {}, parentSHAs: []}
            ]));

            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(100, 0);
            const result = await flagTraversalPrecedingTagAlgorithm("1", tags.values(), true, githubAPI);
            expect([...result]).to.be.empty;
        });

        test("if tag limit is one, should not traverse beyond level of first tag", async () => {
            //      a1 --------------
            //   🡕                    🡖
            // 0 🡒 b1 🡒 b2 🡒 b3(b) 🡒 c1(c) 🡒 c2
            const tags = [
                {name: "b", sha: "b3"},
                {name: "c", sha: "c1"}
            ];

            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {sha: "0", commitDate: {}, parentSHAs: ["a1", "b1"]},
                {sha: "a1", commitDate: {}, parentSHAs: ["c1"]},
                {sha: "b1", commitDate: {}, parentSHAs: ["b2"]},
                {sha: "b2", commitDate: {}, parentSHAs: ["b3"]},
                {sha: "b3", commitDate: {}, parentSHAs: ["c1"]},
                {sha: "c1", commitDate: {}, parentSHAs: ["c2"]},
                {sha: "c2", commitDate: {}, parentSHAs: []}
            ]));

            flagTraversalPrecedingTagAlgorithm = makeFlagTraversalPrecedingTagAlgorithm(100, 1);
            const result = await flagTraversalPrecedingTagAlgorithm("0", tags.values(), true, githubAPI);
            expect([...result]).toEqual([{name: "c", sha: "c1", commitDate: {}}]);
        });
    });
});