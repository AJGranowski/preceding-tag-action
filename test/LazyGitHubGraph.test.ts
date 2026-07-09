import { describe, expect, test } from "vitest";
import { mock } from "vitest-mock-extended";
import type { GitHubAPI } from "../src/GitHubAPI";

import { LazyGitHubGraph } from "../src/LazyGitHubGraph";

function randomString(): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

describe("LazyGitHubGraph", () => {
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
});