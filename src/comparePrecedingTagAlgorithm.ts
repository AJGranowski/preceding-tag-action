import type { GitHubAPI } from "./GitHubAPI";
import type { DateTag } from "./types/DateTag";
import type { Tag } from "./types/Tag";
import type { TopologicalPrecedingTagAlgorithm } from "./types/TopologicalPrecedingTagAlgorithm";

interface TagDifference {
    tags: Tag[];
    commitDifference: number;
}

// eslint-disable-next-line max-len
const comparePrecedingTagAlgorithm: TopologicalPrecedingTagAlgorithm = async (headCommitSHA: string, tags: IteratorObject<Tag>, includeHeadCommitSHA: boolean, githubAPI: GitHubAPI): Promise<IteratorObject<DateTag>> => {
    const tagDistances = tags.map(async (tag) => {
        return {
            tags: [tag],
            commitDifference: await githubAPI.fetchCommitDifference(tag.sha, headCommitSHA)
        };
    });

    const filteredTagDistances = (await Promise.all(tagDistances)).filter((x) => {
        if (isNaN(x.commitDifference)) {
            return false;
        }

        if (includeHeadCommitSHA) {
            return x.commitDifference >= 0;
        }

        return x.commitDifference > 0;
    });

    const precedingTag = filteredTagDistances.reduce((prev: TagDifference | null, next: TagDifference) => {
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
        return [].values();
    }

    return (await Promise.all(precedingTag.tags.map(async (tag: Tag): Promise<DateTag> => ({
        ...tag,
        commitDate: await githubAPI.fetchCommitDate(tag.sha)
    })))).values();
};

export { comparePrecedingTagAlgorithm };