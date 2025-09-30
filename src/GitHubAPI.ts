import type { Octokit } from "@octokit/rest";

import type { CommitDate } from "./types/CommitDate";
import type { GitRef } from "./types/GitRef";
import type { Repository } from "./types/Repository";
import type { Tag } from "./types/Tag";

const MAX_TAGS: number = 1000;

class GitHubAPI {
    private readonly octokit: Octokit;
    private readonly repo: Repository;

    constructor(octokit: Octokit, repo: Repository) {
        this.octokit = octokit;
        this.repo = repo;
    }

    /**
     * Get and return every tag in this repo matching the filter.
     *
     * Will reject if the API is unavailable.
     */
    async fetchAllTags(filter: (string: string) => boolean): Promise<Tag[]> {
        let totalTags = 0;
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repository-tags
        const allTags: Tag[] = await this.octokit.paginate(this.octokit.rest.repos.listTags, {
            owner: this.repo.owner,
            repo: this.repo.repo,
            per_page: 100 // max
        }, (response, done) => {
            const result = response.data.filter((object) => object.commit.sha.length > 0 && filter(object.name))
                .map((object) => ({
                    name: object.name,
                    sha: object.commit.sha
                }));

            totalTags += result.length;
            if (totalTags >= MAX_TAGS) {
                this.octokit.log.warn(`Total tag limit reached in request ${response.url}. (${totalTags} >= ${MAX_TAGS})`);
                done();
            }

            return result;
        });

        this.octokit.log.debug(`${allTags.length} tags fetched.`);
        return allTags;
    }

    /**
     * Returns the commit difference between two references.
     * If the head ref matches the base ref, the result is zero.
     * If the head ref is a descendant of the base ref, the result is positive.
     * If the head ref is an ancestor of the base ref, the result is negative.
     * If the head ref is diverged from the base ref, the result is NaN.
     *
     * Will reject if the API is unavailable, or if the two references cannot be compared.
     */
    async fetchCommitDifference(base: GitRef, head: GitRef): Promise<number> {
        let response;
        try {
            // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#compare-two-commits
            response = await this.octokit.rest.repos.compareCommitsWithBasehead({
                owner: this.repo.owner,
                repo: this.repo.repo,
                basehead: `${base}...${head}`,
                page: 999_999_999_999, // The list of changed files is only shown on the first page of results.
                per_page: 1
            });
        } catch (e: any) {
            // GitHub will return a 422 error if the diff takes too long to generate.
            if (this.isCompareDiffTooLargeError(e)) {
                this.octokit.log.warn(`Diff too large for request ${e.request.method} ${e.request.url}. Defaulting difference to NaN.`);
                return NaN;
            }

            throw e;
        }

        return this.parseCommitDifference(response);
    }

    async fetchCommitSHA(ref: GitRef): Promise<string> {
        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit
        const response = await this.octokit.rest.repos.getCommit({
            owner: this.repo.owner,
            repo: this.repo.repo,
            ref: ref,
            page: 1,
            per_page: 1
        });

        return response.data.sha;
    }

    /**
     * Get the author and committer dates of a commit.
     *
     * Will reject if the API is unavailable, or if the reference does not exist.
     */
    async fetchCommitDate(ref: GitRef): Promise<CommitDate> {
        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit
        const response = await this.octokit.rest.repos.getCommit({
            owner: this.repo.owner,
            repo: this.repo.repo,
            ref: ref,
            page: 1,
            per_page: 1
        });

        return {
            author: response.data.commit.author?.date,
            committer: response.data.commit.committer?.date
        };
    }

    /**
     * Return true if this error response is due to the compare diff taking too long to generate.
     */
    isCompareDiffTooLargeError(error: any): boolean {
        if (error == null || error.status == null || error.request == null || error.response == null || error.response.data == null) {
            return false;
        }

        if (error.status === 422 && error.response.data.message === "Server Error: Sorry, this diff is taking too long to generate.") {
            return true;
        }

        return false;
    }

    /**
     * Extract the commit difference from a compareCommitsWithBasehead response.
     */
    parseCommitDifference(response: Awaited<ReturnType<Octokit["rest"]["repos"]["compareCommitsWithBasehead"]>>): number {
        switch (response.data.status) {
            case "ahead":
                if (response.data.ahead_by < 0) {
                    throw new Error(`ahead_by property is negative: ${response.data.ahead_by}`);
                }

                return response.data.ahead_by;
            case "behind":
                if (response.data.behind_by < 0) {
                    throw new Error(`behind_by property is negative: ${response.data.behind_by}`);
                }

                return -response.data.behind_by;
            case "identical":
                return 0;
            case "diverged":
                return NaN;
            default:
                throw new Error(`Unknown compare status: ${response.data.status}`);
        }
    }
}

export { GitHubAPI };