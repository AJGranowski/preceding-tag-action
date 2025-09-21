import type { Octokit } from "@octokit/rest";

import type { CommitDate } from "./types/CommitDate";
import type { GitRef } from "./types/GitRef";
import type { Repository } from "./types/Repository";

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
    async fetchAllTags(filter: RegExp): Promise<string[]> {
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repository-tags
        const response = await this.octokit.paginate(this.octokit.repos.listTags, {
            owner: this.repo.owner,
            repo: this.repo.repo,
            per_page: 100 // max
        });

        return response.map((object) => object.name)
            .filter((tag: string) => filter.test(tag));
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
        // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#compare-two-commits
        const response = await this.octokit.rest.repos.compareCommitsWithBasehead({
            owner: this.repo.owner,
            repo: this.repo.repo,
            basehead: `${base}...${head}`,
            page: 1,
            per_page: 1
        });

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
}

export { GitHubAPI };