import type { GitHubAPI } from "../GitHubAPI";
import type { Tag } from "./Tag";

interface TopologicalPrecedingTagAlgorithm {
    /**
     * Given a starting commit, a collection of tags, and the github API, find the topological preceding tag(s).
     * A preceding tag is a tag that meets the following definitions:
     * 1. Preceding tags cannot have a tag in their descendant graph.
     * 2. Preceding tags must all share a minimum traversal distance from the starting commit.
     */
    (headCommitSHA: string, tags: Iterable<Tag>, githubAPI: GitHubAPI): Iterable<Tag>
}

export type { TopologicalPrecedingTagAlgorithm };