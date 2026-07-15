import {
    beforeEach,
    describe,
    expect,
    test
} from "vitest";
import type { GitHubAPI } from "../src/GitHubAPI";
import { LazyGitHubGraph } from "../src/LazyGitHubGraph";
import { mock } from "vitest-mock-extended";
import type { MockProxy } from "vitest-mock-extended";

function randomString(): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

async function* iterableToAsyncGenerator<T>(iterable: Iterable<T>): AsyncGenerator<T> {
    for (const item of iterable) {
        yield item;
    }
}

describe("LazyGitHubGraph", () => {
    describe("addCommit", () => {
        test("should throw error if adding a commit that already exists in the graph", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            g.addCommit("commit");
            expect(() => g.addCommit("commit")).toThrowError();
        });
    });

    describe("getCommit", () => {
        test("should return undefined if commit does not exist in the graph", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            expect(g.getCommit("does not exist")).to.be.undefined;
        });

        test("should return something if commit does exist in the graph", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            g.addCommit("commit");
            expect(g.getCommit("commit")).to.not.be.undefined;
        });
    });

    describe("commit data", () => {
        test("added commits with no data should return default data", () => {
            const expected = randomString();
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => expected);
            g.addCommit("abc");
            expect(g.getCommit("abc")).toBe(expected);
        });

        test("added commits with data should return that data", () => {
            const expected = randomString();
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => randomString());
            g.addCommit("abc", expected);
            expect(g.getCommit("abc")).toBe(expected);
        });

        test("commit data can be modified", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => ({data: "default" as string}));
            g.addCommit("abc");
            expect(g.getCommit("abc")!.data).toBe("default");
            g.getCommit("abc")!.data = "something";
            expect(g.getCommit("abc")!.data).toBe("something");
            g.getCommit("abc")!.data = "else";
            expect(g.getCommit("abc")!.data).toBe("else");
        });
    });

    describe("hasCommit", () => {
        test("should return false for a commit that does not exist in the graph", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            expect(g.hasCommit("commit")).toBe(false);
        });

        test("should return true for a commit that does exist in the graph", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            g.addCommit("commit");
            expect(g.hasCommit("commit")).toBe(true);
        });
    });

    describe("getCommits", () => {
        test("should return nothing if the graph has no commits", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            expect([...g.getCommits()]).toEqual([]);
        });

        test("should return all commits if the graph has commits", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            g.addCommit("a");
            g.addCommit("b");
            g.addCommit("c");

            expect([...g.getCommits().map((x) => x.commitSHA)]).to.have.same.members(["a", "b", "c"]);
        });
    });

    describe("getParents", () => {
        test("should return nothing if the commit does not exist in the graph", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            expect([...g.getParents("does not exist")]).toEqual([]);
        });

        test("should return nothing if there are no parents", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            g.addCommit("a");
            expect([...g.getParents("a")]).toEqual([]);
        });

        test("should return parents of a commits if all parents are known", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            g.addCommit("a");
            g.addCommit("b", null, new Set(["a"]), true);
            g.addCommit("c", null, new Set(["a", "b"]), true);

            expect([...g.getParents("c")]).to.have.same.members(["a", "b"]);
        });

        test("should return parents of a commits if some parents are known", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => null);
            g.addCommit("a");
            g.addCommit("b", null, new Set(["a"]), false);
            g.addCommit("c", null, new Set(["a", "b"]), false);

            expect([...g.getParents("c")]).to.have.same.members(["a", "b"]);
        });
    });

    describe("fetch", () => {
        let githubAPI: MockProxy<GitHubAPI>;

        beforeEach(() => {
            githubAPI = mock<GitHubAPI>();
        });

        test("hasCommit should fetch commits if there is no local copy", async () => {
            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {
                    sha: "might exist",
                    commitDate: {},
                    parentSHAs: []
                }
            ]));

            const g = new LazyGitHubGraph(githubAPI, () => null);
            expect(g.hasCommit("might exist", 0)).toBe(false);
            expect(await g.hasCommit("might exist", 1)).toBe(true);
            expect(g.hasCommit("might exist", 0)).toBe(true);
        });

        test("getCommit should fetch commits if there is no local copy", async () => {
            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {
                    sha: "might exist",
                    commitDate: {},
                    parentSHAs: []
                }
            ]));

            const g = new LazyGitHubGraph(githubAPI, () => "data");
            expect(g.getCommit("might exist", 0)).toBe(undefined);
            expect(await g.getCommit("might exist", 1)).toBe("data");
            expect(g.getCommit("might exist", 0)).toBe("data");
        });

        test("should fetch commits if there's a local copy with unknown parents", async () => {
            githubAPI.fetchCommitList.mockReturnValue(iterableToAsyncGenerator([
                {
                    sha: "unknown parents",
                    commitDate: {},
                    parentSHAs: ["a", "b", "c"]
                }
            ]));

            const g = new LazyGitHubGraph(githubAPI, () => null);
            g.addCommit("unknown parents");
            expect([...g.getParents("unknown parents", 0)]).toEqual([]);
            expect([...await g.getParents("unknown parents", 1)]).to.have.same.members(["a", "b", "c"]);
            expect([...g.getParents("unknown parents", 0)]).to.have.same.members(["a", "b", "c"]);
        });
    });
});