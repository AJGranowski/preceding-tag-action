import { Octokit } from "@octokit/rest";
import { GitHubAPI } from "./GitHubAPI";

const octokit: Octokit = new Octokit({});
const githubAPI = new GitHubAPI(octokit, {owner: "AJGranowski", repo: "git-api-test"});

const allTags = await githubAPI.fetchAllTags(/.+/);
for (const tag of allTags) {
    console.log(`distance from ${tag} to C:`, await githubAPI.fetchCommitDifference(tag, "B"));
}