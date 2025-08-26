import { Octokit } from "@octokit/rest";

const octokit: Octokit = new Octokit({});

// https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repository-tags
const someTagsResponse = await octokit.rest.repos.listTags({
    owner: "AJGranowski",
    repo: "git-api-test"
});

// https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28#list-matching-references
const allTagsResponse = await octokit.rest.git.listMatchingRefs({
    owner: "AJGranowski",
    repo: "git-api-test",
    ref: "tags"
});

// https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#compare-two-commits
const compareTagsCD = await octokit.rest.repos.compareCommitsWithBasehead({
    owner: "AJGranowski",
    repo: "git-api-test",
    basehead: "D...C"
});

const compareTagsAD = await octokit.rest.repos.compareCommitsWithBasehead({
    owner: "AJGranowski",
    repo: "git-api-test",
    basehead: "D...A"
});

console.log(someTagsResponse);
console.log(allTagsResponse);
console.log(compareTagsCD);
console.log(compareTagsAD);

export {};