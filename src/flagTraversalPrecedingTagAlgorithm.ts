import type { GitHubAPI } from "./GitHubAPI";
import type { Tag } from "./types/Tag";
import type { TopologicalPrecedingTagAlgorithm } from "./types/TopologicalPrecedingTagAlgorithm";
import { LazyGitHubGraph } from "./LazyGitHubGraph";

interface QueueEntry {
    commitSHA: string;
    depth: number;
    flags: number;
}

function countBits(n: number): number {
    let result = 0;
    while (n !== 0) {
        n &= (n - 1);
        result++;
    }

    return result;
}

const SEEN_FLAG = 1;
const FLAG_OFFSET = 1;

const MAX_TAGS = 4;
const MAX_COMMITS = 100;

// eslint-disable-next-line max-len, complexity
const flagTraversalPrecedingTagAlgorithm: TopologicalPrecedingTagAlgorithm = async (headCommitSHA: string, tags: Iterable<Tag>, includeHeadCommitSHA: boolean, githubAPI: GitHubAPI): Promise<Iterable<Tag>> => {
    const g = new LazyGitHubGraph(githubAPI, () => ({
        flags: 0 as number,
        depth: null as number | null,
        tags: new Set<string>()
    }));

    g.addCommit(headCommitSHA);
    for (const tag of tags) {
        if (g.hasCommit(tag.sha)) {
            g.getCommit(tag.sha)!.tags.add(tag.name);
        } else {
            g.addCommit(tag.sha, {
                flags: 0,
                depth: null,
                tags: new Set([tag.name])
            });
        }
    }

    const tag_to_flags = new Map();
    let seen_commits = 0;
    const q: QueueEntry[] = [{
        commitSHA: headCommitSHA,
        depth: 0,
        flags: SEEN_FLAG
    }];

    while (q.length > 0) {
        const element = q.shift()!;
        const commitSHA = element.commitSHA;
        let depth = element.depth;
        let flags = element.flags;

        // Skip invalid commits
        if (!(await g.hasCommit(commitSHA, true))) {
            continue;
        }

        const data = (await g.getCommit(commitSHA, true))!;

        // Skip visited commits
        if (data.flags === flags) {
            continue;
        }

        // Skip unvisited commits if we've hit any of our traversal limits
        if ((data.flags & SEEN_FLAG) !== SEEN_FLAG) {
            if (seen_commits >= MAX_COMMITS || (tag_to_flags.size >= MAX_TAGS && seen_commits > 0)) {
                continue;
            }

            seen_commits++;
        }

        data.flags |= flags;
        if (data.depth == null) {
            data.depth = depth;
        } else {
            depth = data.depth;
        }

        if (data.tags.size > 0) {
            if (tag_to_flags.has(commitSHA)) {
                flags |= tag_to_flags.get(commitSHA);
            } else {
                tag_to_flags.set(commitSHA, 1 << (tag_to_flags.size + FLAG_OFFSET));
            }
        }

        for (const parent of await g.getParents(commitSHA)) {
            q.push({
                commitSHA: parent,
                depth: depth + 1,
                flags: flags
            });
        }
    }

    let lowestFlagCount = null;
    let lowestDepth = null;
    let precedingCommits: any[] = [];
    for (const commit of g.getCommits()) {
        if (commit.data.depth == null || commit.data.tags.size === 0) {
            continue;
        }

        const flagCount = countBits(commit.data.flags);
        if (lowestFlagCount == null || flagCount < lowestFlagCount) {
            lowestFlagCount = flagCount;
            lowestDepth = commit.data.depth;
            precedingCommits = [commit];
        } else if (flagCount === lowestFlagCount && (lowestDepth == null || commit.data.depth < lowestDepth)) {
            lowestDepth = commit.data.depth;
            precedingCommits = [commit];
        } else if (flagCount === lowestFlagCount && commit.data.depth === lowestDepth) {
            precedingCommits.push(commit);
        }
    }

    console.log(precedingCommits.length);
    for (const a of precedingCommits) {
        console.log(a.commitSHA, a.data.tags.values());
    }

    throw new Error("STOP HERE. NOW.");

    return [];
};

export { flagTraversalPrecedingTagAlgorithm };