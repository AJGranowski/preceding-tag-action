import * as core from "@actions/core";
import { context } from "@actions/github";
import { Octokit } from "@octokit/rest";

import { fetchPrecedingTag } from "./fetchPrecedingTag";
import { GitHubAPI } from "./GitHubAPI";
import { Input } from "./Input";

try {
    await (async (): Promise<void> => {
        const input: Input = new Input(core.getInput, core.getBooleanInput, context);
        const octokit: Octokit = new Octokit({
            auth: input.getToken()
        });

        const githubAPI = new GitHubAPI(octokit, input.getRepository());
        const precedingTag = await fetchPrecedingTag(githubAPI, input.getRef(), {
            filter: input.getFilter(),
            excludeRef: input.getExcludeRef()
        });

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