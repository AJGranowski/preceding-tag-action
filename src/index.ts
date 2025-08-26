import { Octokit } from "@octokit/rest";

import { GitHubAPI } from "./GitHubAPI";
import { PrecedingTag } from "./PrecedingTag";

const octokit: Octokit = new Octokit({});
const githubAPI = new GitHubAPI(octokit, {owner: "AJGranowski", repo: "git-api-test"});
const precedingTag = new PrecedingTag(githubAPI);

console.log(await precedingTag.fetchPrecedingTag("HEAD"));