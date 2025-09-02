import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";

import { GitHubAPI } from "./GitHubAPI";
import { fetchPrecedingTag } from "./fetchPrecedingTag";

try {
    await (async (): Promise<void> => {
        const octokit: Octokit = new Octokit({
            auth: core.getInput("token")
        });
        const githubAPI = new GitHubAPI(octokit, {owner: "AJGranowski", repo: "preceding-tag-action"});
        const precedingTag = await fetchPrecedingTag(githubAPI, "HEAD");
        if (precedingTag == null) {
            core.setOutput("tag", "");
        } else {
            core.setOutput("tag", precedingTag);
        }
    })();
} catch (e) {
    if (e instanceof Error) {
        core.setFailed(e);
    } else {
        core.setFailed("An unknown error occurred.");
    }
}