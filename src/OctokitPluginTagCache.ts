import type { Octokit } from "@octokit/core";

export function tagCache(octokit: Octokit): any {
    octokit.hook.before("request", async (arg) => {
        console.log(arg);
    });

    return;
}