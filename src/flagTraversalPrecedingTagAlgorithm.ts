import type { CommitDate } from "./types/CommitDate";
import type { DateTag } from "./types/DateTag";
import type { GitHubAPI } from "./GitHubAPI";
import { LazyGitHubGraph } from "./LazyGitHubGraph";
import type { LazyGitHubGraphNode } from "./LazyGitHubGraph";
import { Queue } from "./Queue";
import type { Tag } from "./types/Tag";
import type { TopologicalPrecedingTagAlgorithm } from "./types/TopologicalPrecedingTagAlgorithm";

interface GraphData {
    flags: number;
    depth: number | null;
    tags: Set<string>;
    commitDate?: CommitDate;
}

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

const VISITED_FLAG = 1;
const FLAG_OFFSET = 1;
const MAX_TAGS = 30 - FLAG_OFFSET;
const MIN_BATCH_SIZE = 30;

/**
 * Perform a breadth-first search.
 * @param initialize The root node of the search.
 * @param traversal Given a node, generate a list of nodes to add to the search.
 */
async function bfs<T>(initialize: () => T, traversal: (node: T) => Promise<IteratorObject<T>>): Promise<void> {
    const queue: Queue<T> = new Queue();
    queue.enqueue(initialize());
    while (queue.hasItems()) {
        for (const next of await traversal(queue.dequeue()!)) {
            queue.enqueue(next);
        }
    }
}

/**
 * Calculate the batch size for the next fetch
 */
function calculateBatchSize(numberOfFoundTags: number, seenCommits: number): number {
    if (numberOfFoundTags === 0) {
        return LazyGitHubGraph.MAX_FETCH_SIZE;
    }

    return Math.max(MIN_BATCH_SIZE, Math.min(LazyGitHubGraph.MAX_FETCH_SIZE, Math.round(2 * seenCommits / numberOfFoundTags)));
}

/**
 * Given a traversed graph, find the tags with the lowest traversal flag count and shallowest depth.
 */
// eslint-disable-next-line complexity, max-len
function findPrecedingTags(graphCommits: IteratorObject<LazyGitHubGraphNode<GraphData>>, headCommitSHA: string, includeHeadCommitSHA: boolean): IteratorObject<DateTag> {
    let lowestFlagCount = null;
    let lowestDepth = null;
    let precedingCommits: DateTag[] = [];
    for (const commit of graphCommits) {
        const invalidCommit = commit.data.depth == null || (!includeHeadCommitSHA && commit.commitSHA === headCommitSHA);
        const unseenCommit = (commit.data.flags & VISITED_FLAG) !== VISITED_FLAG;
        const untaggedCommit = commit.data.tags.size === 0;
        if (invalidCommit || unseenCommit || untaggedCommit) {
            continue;
        }

        const depth = commit.data.depth!;
        const tags: IteratorObject<DateTag> = commit.data.tags.values().map((tag) => ({
            name: tag,
            sha: commit.commitSHA,
            commitDate: commit.data.commitDate == null ? {} : commit.data.commitDate
        }));

        const flagCount = countBits(commit.data.flags);
        if (lowestFlagCount == null || flagCount < lowestFlagCount) {
            lowestFlagCount = flagCount;
            lowestDepth = depth;
            precedingCommits = [...tags];
        } else if (flagCount === lowestFlagCount && (lowestDepth == null || depth < lowestDepth)) {
            lowestDepth = depth;
            precedingCommits = [...tags];
        } else if (flagCount === lowestFlagCount && depth === lowestDepth) {
            precedingCommits.push(...tags);
        }
    }

    return precedingCommits.values();
}

function isTraversalLimitReached(seenCommits: number, seenTags: number, traversalCommitsLimit: number, traversalTagsLimit: number): boolean {
    return seenCommits >= traversalCommitsLimit || (seenTags >= traversalTagsLimit && seenCommits > 0);
}

/**
 * Create a topological preceding tag algorithm that traverses some number of tags, and returns the shallowest tag with no tagged descendants.
 * @throws Throws an error if the number of tags to traverse is too high.
 */
const makeFlagTraversalPrecedingTagAlgorithm = (traversalCommitsLimit: number = 200, traversalTagsLimit: number = 6): TopologicalPrecedingTagAlgorithm => {
    if (traversalTagsLimit > MAX_TAGS) {
        throw new Error(`The input tag traversal limit: ${traversalTagsLimit}, is larger than the maximum limit of ${MAX_TAGS})`);
    }

    return async (headCommitSHA: string, tags: IteratorObject<Tag>, includeHeadCommitSHA: boolean, githubAPI: GitHubAPI): Promise<IteratorObject<DateTag>> => {
        const graph = new LazyGitHubGraph<GraphData>(githubAPI, () => ({
            flags: 0,
            depth: null,
            tags: new Set<string>(),
            commitDate: undefined
        }), (data, fetchResult) => {data.commitDate = fetchResult.commitDate;});

        graph.addCommit(headCommitSHA);
        let noTags = true;
        for (const tag of tags) {
            noTags = false;
            if (graph.hasCommit(tag.sha)) {
                graph.getCommit(tag.sha)!.tags.add(tag.name);
            } else {
                graph.addCommit(tag.sha, {
                    flags: 0,
                    depth: null,
                    tags: new Set([tag.name])
                });
            }
        }

        // Don't search if there's nothing to search for
        if (noTags) {
            return [].values();
        }

        const tagToFlags = new Map();
        let visitedCommits = 0;
        const bfsInitialize = (): QueueEntry => ({
            commitSHA: headCommitSHA,
            depth: 0,
            flags: VISITED_FLAG
        });

        const bfsTraversal = async (node: QueueEntry): Promise<IteratorObject<QueueEntry>> => {
            const commitSHA = node.commitSHA;
            let depth = node.depth;
            let flags = node.flags;

            const batchSize = calculateBatchSize(tagToFlags.size, visitedCommits);
            const data = (await graph.getCommit(commitSHA, batchSize))!;

            // Skip visited commits
            if ((data.flags & flags) === flags) {
                return [].values();
            }

            // Skip unvisited commits if we've hit any of our traversal limits
            if ((data.flags & VISITED_FLAG) !== VISITED_FLAG) {
                if (isTraversalLimitReached(visitedCommits, tagToFlags.size, traversalCommitsLimit, traversalTagsLimit)) {
                    return [].values();
                }

                visitedCommits++;
            }

            data.flags = flags = data.flags | flags;
            depth = (data.depth ??= depth); // Expression evaluates to `data.depth` if it exists, otherwise `depth`.

            if (data.tags.size > 0) {
                if (!tagToFlags.has(commitSHA)) {
                    tagToFlags.set(commitSHA, 1 << (tagToFlags.size + FLAG_OFFSET));
                }

                flags |= tagToFlags.get(commitSHA);
            }

            return (await graph.getParents(commitSHA, batchSize)).map((parent) => ({
                commitSHA: parent,
                depth: depth + 1,
                flags: flags
            }));
        };

        await bfs(bfsInitialize, bfsTraversal);
        return findPrecedingTags(graph.getCommits(), headCommitSHA, includeHeadCommitSHA);
    };
};

export { makeFlagTraversalPrecedingTagAlgorithm };