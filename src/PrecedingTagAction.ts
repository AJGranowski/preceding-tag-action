import * as core from "@actions/core";
import { context } from "@actions/github";
import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

import { fetchPrecedingTag } from "./fetchPrecedingTag";
import { GitHubAPI } from "./GitHubAPI";
import { Input } from "./Input";

// Do not retry if the retry time is longer than 62 minutes.
const maxRetryTimeSeconds = 62 * 60;

async function main(): Promise<void> {
    const input: Input = new Input(core.getInput, core.getBooleanInput, core.warning, context);
    input.validateInputs();
    const octokit: Octokit = new (Octokit.plugin(retry, throttling))({
        auth: input.getToken() != null ? `token ${input.getToken()}` : undefined,
        throttle: {
            onRateLimit: (retryAfter, options, octokit, retryCount): boolean => {
                const logPrefix = `Request quota exhausted for request ${options.method} ${JSON.stringify(options)}.`;
                if (retryCount >= 1) {
                    octokit.log.warn(logPrefix);
                    return false;
                }

                if (retryAfter > maxRetryTimeSeconds) {
                    octokit.log.warn(`${logPrefix} Retry time (${retryAfter} seconds) exceeds the maximum retry time (${maxRetryTimeSeconds} seconds).`);
                    return false;
                }

                const date = new Date();
                date.setSeconds(date.getSeconds() + retryAfter);
                octokit.log.warn(`${logPrefix} Retrying after ${retryAfter} seconds (${date.toISOString()})... `);
                return true;
            },
            onSecondaryRateLimit: (retryAfter, options): boolean => {
                octokit.log.error(`Abuse detected for request ${options.method} ${options.url}`);
                return false;
            }
        }
    });

    const githubAPI = new GitHubAPI(octokit, input.getRepository());
    const precedingTag = await fetchPrecedingTag(githubAPI, input.getRef(), {
        filter: input.getFilter(),
        includeRef: input.getIncludeRef()
    });

    if (precedingTag == null) {
        core.setOutput("tag", input.getDefaultTag());
        core.setOutput("tag-found", false);
    } else {
        core.setOutput("tag", precedingTag);
        core.setOutput("tag-found", true);
    }
}

export default async (): Promise<void> => {
    try {
        await main();
    } catch (e) {
        if (e instanceof Error) {
            core.setFailed(e);
        } else {
            core.setFailed("An unknown error occurred.");
        }
    }
};