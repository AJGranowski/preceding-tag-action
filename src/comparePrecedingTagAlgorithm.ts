import type { GitHubAPI } from "./GitHubAPI";
import type { Tag } from "./types/Tag";
import type { TopologicalPrecedingTagAlgorithm } from "./types/TopologicalPrecedingTagAlgorithm";
import { AsyncIteratorUtilities } from "./AsyncIteratorUtilities";

interface TagDifference {
    tags: Tag[];
    commitDifference: number;
}

// eslint-disable-next-line max-len
const comparePrecedingTagAlgorithm: TopologicalPrecedingTagAlgorithm = async (headCommitSHA: string, tags: Iterable<Tag> | AsyncIterable<Tag>, includeHeadCommitSHA: boolean, githubAPI: GitHubAPI): Promise<Iterable<Tag>> => {
    const asyncIterable = AsyncIteratorUtilities.map(tags, async (tag) => {
        return {
            tags: [tag],
            commitDifference: await githubAPI.fetchCommitDifference(tag.sha, headCommitSHA)
        };
    });

    const tagDistances = await Promise.all(await Array.fromAsync(asyncIterable));
    const precedingTag = tagDistances
        .filter((x) => {
            if (isNaN(x.commitDifference)) {
                return false;
            }

            if (includeHeadCommitSHA) {
                return x.commitDifference >= 0;
            }

            return x.commitDifference > 0;
        })
        .reduce((prev: TagDifference | null, next: TagDifference) => {
            if (prev == null) {
                return next;
            }

            const nextMinusPrev = Math.abs(next.commitDifference) - Math.abs(prev.commitDifference);
            if (nextMinusPrev < 0) {
                return next;
            } else if (nextMinusPrev > 0) {
                return prev;
            }

            return {
                tags: prev.tags.concat(next.tags),
                commitDifference: prev.commitDifference
            };
        }, null);

    if (precedingTag == null) {
        return [];
    } else {
        return precedingTag.tags;
    }
};

export { comparePrecedingTagAlgorithm };