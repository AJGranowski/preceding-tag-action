import * as core from "@actions/core";
import { context } from "@actions/github";
import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

import { fetchPrecedingTag } from "./fetchPrecedingTag";
import { GitHubAPI } from "./GitHubAPI";
import { Input } from "./Input";
import type { Tag } from "./types/Tag";

// Do not retry if the retry time is longer than 62 minutes.
const MAX_RETRY_TIME_SECONDS = 62 * 60;

async function main(): Promise<void> {
    const input: Input = new Input(core.getInput, core.getBooleanInput, core.warning, context);
    input.validateInputs();
    const octokit: Octokit = new (Octokit.plugin(retry, throttling))({
        auth: input.getToken() != null ? `token ${input.getToken()}` : undefined,
        throttle: {
            onRateLimit: (retryAfter, options, octokit, retryCount): boolean => {
                const logPrefix = `Request quota exhausted for request ${options.method} ${options.url}.`;
                if (retryCount >= 1) {
                    octokit.log.warn(logPrefix);
                    return false;
                }

                retryAfter = retryAfter + 10;
                if (retryAfter > MAX_RETRY_TIME_SECONDS) {
                    octokit.log.warn(`${logPrefix} Retry time (${retryAfter} seconds) exceeds the maximum retry time (${MAX_RETRY_TIME_SECONDS} seconds).`);
                    return false;
                }

                const date = new Date();
                date.setSeconds(date.getSeconds() + retryAfter);
                console.log(`${logPrefix} Retrying after ${retryAfter} seconds (${date.toISOString()})... `);
                return true;
            },
            onSecondaryRateLimit: (retryAfter, options): boolean => {
                octokit.log.error(`Abuse detected for request ${options.method} ${options.url}`);
                return false;
            }
        }
    });

    const githubAPI = new GitHubAPI(octokit, input.getRepository());
    const precedingTag: Tag | null = await fetchPrecedingTag(githubAPI, input.getRef(), {
        filter: input.getFilter(),
        includeRef: input.getIncludeRef()
    });

    if (precedingTag == null) {
        core.setOutput("tag", input.getDefaultTag());
        core.setOutput("tag-found", false);
    } else {
        core.setOutput("tag", precedingTag.name);
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