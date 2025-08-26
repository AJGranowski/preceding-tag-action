import { Octokit } from "@octokit/rest";
import { GitHubAPI } from "./GitHubAPI";

const octokit: Octokit = new Octokit({});
const githubAPI = new GitHubAPI(octokit, {owner: "AJGranowski", repo: "git-api-test"});
console.log(await githubAPI.fetchAllTags(/.+/));
console.log(await githubAPI.fetchAllTags(/[B-Z]/));