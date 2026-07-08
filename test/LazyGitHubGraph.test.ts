import { describe, expect, test } from "vitest";
import { mock } from "vitest-mock-extended";
import type { GitHubAPI } from "../src/GitHubAPI";

import { LazyGitHubGraph } from "../src/LazyGitHubGraph";

function randomString(): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

describe("LazyGitHubGraph", () => {
    describe("node data", () => {
        test("added nodes with no data should return default data", () => {
            const expected = randomString();
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => expected);
            g.addCommit("abc");
            expect(g.getCommit("abc")).toBe(expected);
        });

        test("added nodes with data should return that data", () => {
            const expected = randomString();
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => randomString());
            g.addCommit("abc", expected);
            expect(g.getCommit("abc")).toBe(expected);
        });

        test("node data can be modified", () => {
            const g = new LazyGitHubGraph(mock<GitHubAPI>({}), () => ({data: "default" as string}));
            g.addCommit("abc");
            expect(g.getCommit("abc")!.data).toBe("default");
            g.getCommit("abc")!.data = "something";
            expect(g.getCommit("abc")!.data).toBe("something");
            g.getCommit("abc")!.data = "else";
            expect(g.getCommit("abc")!.data).toBe("else");
        });
    });
});