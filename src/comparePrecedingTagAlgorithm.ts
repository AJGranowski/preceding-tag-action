import type { GitHubAPI } from "./GitHubAPI";
import type { Tag } from "./types/Tag";
import type { TopologicalPrecedingTagAlgorithm } from "./types/TopologicalPrecedingTagAlgorithm";
import { IteratorUtilities } from "./IteratorUtilities";

interface TagDifference {
    tags: Tag[];
    commitDifference: number;
}

// eslint-disable-next-line max-len
const comparePrecedingTagAlgorithm: TopologicalPrecedingTagAlgorithm = async (headCommitSHA: string, tags: Iterable<Tag>, includeHeadCommitSHA: boolean, githubAPI: GitHubAPI) => {
    const tagDistances = await Promise.all(IteratorUtilities.map(tags, async (tag) => {
        return {
            tags: [tag],
            commitDifference: await githubAPI.fetchCommitDifference(tag.sha, headCommitSHA)
        };
    }));

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