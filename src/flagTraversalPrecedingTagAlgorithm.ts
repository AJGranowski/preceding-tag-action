import type { CommitDate } from "./types/CommitDate";
import type { GitHubAPI } from "./GitHubAPI";
import type { DateTag } from "./types/DateTag";
import type { Tag } from "./types/Tag";
import type { TopologicalPrecedingTagAlgorithm } from "./types/TopologicalPrecedingTagAlgorithm";
import { LazyGitHubGraph } from "./LazyGitHubGraph";
import { Queue } from "./Queue";

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
const MAX_TAGS = 30 - FLAG_OFFSET;
const MIN_BATCH_SIZE = 30;

const makeFlagTraversalPrecedingTagAlgorithm = (traversalCommitsLimit: number = 200, traversalTagsLimit: number = 6): TopologicalPrecedingTagAlgorithm => {
    if (traversalTagsLimit > MAX_TAGS) {
        throw new Error(`The input tag traversal limit: ${traversalTagsLimit}, is larger than the maximum limit of ${MAX_TAGS})`);
    }

    // eslint-disable-next-line complexity
    return async (headCommitSHA: string, tags: IteratorObject<Tag>, includeHeadCommitSHA: boolean, githubAPI: GitHubAPI): Promise<IteratorObject<DateTag>> => {
        const g = new LazyGitHubGraph(githubAPI, () => ({
            flags: 0 as number,
            depth: null as number | null,
            tags: new Set<string>(),
            commitDate: undefined as CommitDate | undefined
        }));

        g.addCommit(headCommitSHA);
        let noTags = true;
        for (const tag of tags) {
            noTags = false;
            if (g.hasCommit(tag.sha)) {
                g.getCommit(tag.sha)!.tags.add(tag.name);
            } else {
                g.addCommit(tag.sha, {
                    flags: 0,
                    depth: null,
                    tags: new Set([tag.name]),
                    commitDate: undefined
                });
            }
        }

        // Don't search if there's nothing to search for
        if (noTags) {
            return [].values();
        }

        const tag_to_flags = new Map();
        let seen_commits = 0;
        const q = new Queue<QueueEntry>();
        q.enqueue({
            commitSHA: headCommitSHA,
            depth: 0,
            flags: SEEN_FLAG
        });

        while (q.hasItems()) {
            const element = q.dequeue()!;
            const commitSHA = element.commitSHA;
            let depth = element.depth;
            let flags = element.flags;

            const batchSize = tag_to_flags.size === 0 ?
                LazyGitHubGraph.MAX_FETCH_SIZE :
                Math.max(MIN_BATCH_SIZE, Math.min(LazyGitHubGraph.MAX_FETCH_SIZE, Math.round(2 * seen_commits / tag_to_flags.size)));

            const data = (await g.getCommit(commitSHA, batchSize))!;

            // Skip visited commits
            if ((data.flags & flags) === flags) {
                continue;
            }

            // Skip unvisited commits if we've hit any of our traversal limits
            if ((data.flags & SEEN_FLAG) !== SEEN_FLAG) {
                if (seen_commits >= traversalCommitsLimit || (tag_to_flags.size >= traversalTagsLimit && seen_commits > 0)) {
                    continue;
                }

                seen_commits++;
            }

            flags |= data.flags;
            data.flags = flags;

            if (data.depth == null) {
                data.depth = depth;
            } else {
                depth = data.depth;
            }

            if (data.tags.size > 0) {
                if (!tag_to_flags.has(commitSHA)) {
                    tag_to_flags.set(commitSHA, 1 << (tag_to_flags.size + FLAG_OFFSET));
                }

                flags |= tag_to_flags.get(commitSHA);
            }

            for (const parent of await g.getParents(commitSHA, batchSize)) {
                q.enqueue({
                    commitSHA: parent,
                    depth: depth + 1,
                    flags: flags
                });
            }
        }

        let lowestFlagCount = null;
        let lowestDepth = null;
        let precedingCommits: DateTag[] = [];
        for (const commit of g.getCommits()) {
            // eslint-disable-next-line max-len
            if (commit.data.depth == null || commit.data.tags.size === 0 || (commit.data.flags & SEEN_FLAG) !== SEEN_FLAG || (!includeHeadCommitSHA && commit.commitSHA === headCommitSHA)) {
                continue;
            }

            const tags: IteratorObject<DateTag> = commit.data.tags.values().map((tag) => ({
                name: tag,
                sha: commit.commitSHA,
                commitDate: commit.data.commitDate == null ? {} : commit.data.commitDate
            }));

            const flagCount = countBits(commit.data.flags);
            if (lowestFlagCount == null || flagCount < lowestFlagCount) {
                lowestFlagCount = flagCount;
                lowestDepth = commit.data.depth;
                precedingCommits = [...tags];
            } else if (flagCount === lowestFlagCount && (lowestDepth == null || commit.data.depth < lowestDepth)) {
                lowestDepth = commit.data.depth;
                precedingCommits = [...tags];
            } else if (flagCount === lowestFlagCount && commit.data.depth === lowestDepth) {
                precedingCommits.push(...tags);
            }
        }

        return precedingCommits.values();
    };
};

export { makeFlagTraversalPrecedingTagAlgorithm };