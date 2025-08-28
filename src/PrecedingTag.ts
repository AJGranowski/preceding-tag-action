import type { GitHubAPI } from "./GitHubAPI";

interface TagDifference {
    tags: string[]
    commitDifference: number
}

type GitRef = string;

class PrecedingTag {
    private githubAPI: GitHubAPI;
    constructor(githubAPI: GitHubAPI) {
        this.githubAPI = githubAPI;
    }

    /**
     * This function finds the most recent tag that is reachable from a commit.
     * Functions similarly to git-describe using GitHub endpoints instead of a local git database.
     * If multiple tags are the same distance away, this function returns the most recent tag (by committer date, then author date).
     * If no tags are reachable from this commit, this function returns null.
     *
     * Will reject if the API is unavailable, or if the reference does not exist.
     */
    async fetchPrecedingTag(head: GitRef, filter?: RegExp): Promise<string | null> {
        filter = filter ?? /^.+$/;
        const allTags = await this.githubAPI.fetchAllTags(filter);
        const tagDistances = await Promise.all(allTags.map(async (tag) => {
            return {
                tags: [tag],
                commitDifference: await this.githubAPI.fetchCommitDifference(tag, head)
            };
        }));

        const precedingTag = tagDistances
            .filter((x) => !isNaN(x.commitDifference) && x.commitDifference >= 0)
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
                commitDate: await this.githubAPI.fetchCommitDate(tag)
            };
        }));

        return commitDates.reduce((prev, next) => {
            let compareNextPrev = this.nullableDateComparator(next.commitDate.committer, prev.commitDate.committer);
            if (compareNextPrev > 0) {
                return next;
            } else if (compareNextPrev < 0) {
                return prev;
            }

            compareNextPrev = this.nullableDateComparator(next.commitDate.author, prev.commitDate.author);

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
    private readonly nullableDateComparator = (a: string | null | undefined, b: string | null | undefined): number => {
        if (a != null && b != null) {
            return (new Date(a)).getTime() - (new Date(b)).getTime();
        } else if (a == null && b != null) {
            return -1;
        } else if (a != null && b == null) {
            return 1;
        }

        return 0;
    };
}

export { PrecedingTag };