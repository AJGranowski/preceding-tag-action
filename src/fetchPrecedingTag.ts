import type { GitHubAPI } from "./GitHubAPI";
import type { GitRef } from "./types/GitRef";
import type { Tag } from "./types/Tag";

interface Options {
    filter?: (string: string) => boolean;
    includeRef?: boolean;
}

interface TagDifference {
    tags: Tag[];
    commitDifference: number;
}

/**
 * This function finds the most recent tag that is reachable from a commit.
 * Functions similarly to git-describe using GitHub endpoints instead of a local git database.
 * If multiple tags are the same distance away, this function returns the most recent tag (by committer date, then author date).
 * If no tags are reachable from this commit, this function returns null.
 *
 * Will reject if the API is unavailable, or if the reference does not exist.
 */
async function fetchPrecedingTag(githubAPI: GitHubAPI, ref: GitRef, options?: Options): Promise<Tag | null> {
    const optionsWithDefaults = {
        filter: (string: string): boolean => string.length > 0,
        includeRef: false,
        ...options
    } satisfies Required<Options>;

    const sha = await githubAPI.fetchCommitSHA(ref);
    const allTags = await githubAPI.fetchAllTags(optionsWithDefaults.filter);
    const tagDistances = await Promise.all(allTags.map(async (tag) => {
        return {
            tags: [tag],
            commitDifference: await githubAPI.fetchCommitDifference(tag.sha, sha)
        };
    }));

    const precedingTag = tagDistances
        .filter((x) => {
            if (isNaN(x.commitDifference)) {
                return false;
            }

            if (optionsWithDefaults.includeRef) {
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

    if (precedingTag == null || precedingTag.tags.length === 0) {
        return null;
    } else if (precedingTag.tags.length === 1) {
        return precedingTag.tags[0];
    }

    const commitDates = await Promise.all(precedingTag.tags.map(async (tag) => {
        return {
            tag: tag,
            commitDate: await githubAPI.fetchCommitDate(tag.sha)
        };
    }));

    return commitDates.reduce((prev, next) => {
        let compareNextPrev = nullableDateComparator(next.commitDate.committer, prev.commitDate.committer);
        if (compareNextPrev > 0) {
            return next;
        } else if (compareNextPrev < 0) {
            return prev;
        }

        compareNextPrev = nullableDateComparator(next.commitDate.author, prev.commitDate.author);

        if (compareNextPrev > 0) {
            return next;
        } else if (compareNextPrev < 0) {
            return prev;
        }

        return prev;
    }).tag;
}

/**
 * Simple date comparator, but asserts null is less than any date.
 */
const nullableDateComparator = (a: string | null | undefined, b: string | null | undefined): number => {
    if (a != null && b != null) {
        return (new Date(a)).getTime() - (new Date(b)).getTime();
    } else if (a == null && b != null) {
        return -1;
    } else if (a != null && b == null) {
        return 1;
    }

    return 0;
};

export { fetchPrecedingTag };