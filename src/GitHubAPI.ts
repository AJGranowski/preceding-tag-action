import type { Octokit } from "@octokit/rest";

import type { CommitDate } from "./CommitDate";
import type { Repository } from "./Repository";

type GitTag = string;
type GitRef = string;

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
    async fetchAllTags(filter: RegExp): Promise<GitTag[]> {
        // https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28#list-matching-references
        return this.octokit.rest.git.listMatchingRefs({
            owner: this.repo.owner,
            repo: this.repo.repo,
            ref: "tags"
        }).then((response) => {
            return response.data
                .map((object) => object.ref.substring("refs/tags/".length))
                .filter((tag: string) => filter.test(tag));
        });

        /*
         * If the above endpoint doesn't return all tags for some reason, switch to iterating over listTags
         * https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repository-tags
         */
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
        return this.octokit.rest.repos.compareCommitsWithBasehead({
            owner: this.repo.owner,
            repo: this.repo.repo,
            basehead: `${base}...${head}`,
            page: 1,
            per_page: 1
        }).then((response) => {
            switch (response.data.status) {
                case "ahead":
                    return response.data.ahead_by;
                case "behind":
                    return -response.data.behind_by;
                case "identical":
                    return 0;
                case "diverged":
                    return NaN;
                default:
                    throw new Error(`Unknown compare status: ${response.data.status}`);
            }
        });
    }

    /**
     * Get the author and committer dates of a commit.
     *
     * Will reject if the API is unavailable, or if the reference does not exist.
     */
    async fetchCommitDate(ref: GitRef): Promise<CommitDate> {
        return this.octokit.rest.repos.getCommit({
            owner: this.repo.owner,
            repo: this.repo.repo,
            ref: ref,
            page: 1,
            per_page: 1
        }).then((response) => {
            return {
                author: response.data.commit.author?.date,
                committer: response.data.commit.committer?.date
            };
        });
    }
}

export { GitHubAPI };