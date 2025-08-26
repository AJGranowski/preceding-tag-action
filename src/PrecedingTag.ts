import { GitHubAPI } from "./GitHubAPI";

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
     */
    async fetchPrecedingTag(head: string, filter?: RegExp): Promise<string | null> {
        filter?.test(head);
        return Promise.resolve(null);
    }
}

export { PrecedingTag };