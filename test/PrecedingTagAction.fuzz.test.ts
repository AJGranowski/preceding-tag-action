import {
    describe,
    expect,
    test,
    vi
} from "vitest";

import * as fc from "fast-check";

import * as core from "@actions/core";
import { context } from "@actions/github";
import { Octokit } from "@octokit/rest";

import PrecedingTagAction from "../src/PrecedingTagAction";

vi.mock("@actions/core", () => ({
    getInput: undefined,
    getBooleanInput: undefined,
    setFailed: undefined,
    setOutput: undefined,
    warning: undefined
}));

vi.mock("@actions/github", () => ({
    context: {
        repo: {
            owner: undefined,
            repo: undefined
        }
    }
}));

vi.mock("@octokit/rest", () => {
    const Octokit = vi.fn();
    (Octokit as any).plugin = vi.fn().mockReturnValue(Octokit);
    Octokit.prototype.log = {
        debug: () => {},
        error: () => {},
        info: () => {},
        warn: () => {}
    };

    Octokit.prototype.paginate = async (fn: any, args: any, mapper: any = (response: any) => response.data) => {
        return mapper(await fn(args), () => {});
    };

    Octokit.prototype.paginate.iterator = async function* (fn: any, args: any): AsyncGenerator<any> {
        yield await fn(args);
    };

    Octokit.prototype.rest = {
        repos: {
            compareCommitsWithBasehead: undefined,
            getCommit: undefined,
            listTags: undefined
        }
    };

    return { Octokit };
});

const notImplementedFn = () => {throw new Error("Not implemented.");};
const rejectFn = () => Promise.reject();
const resolveFn = () => Promise.resolve();

fc.configureGlobal({ numRuns: 100000, interruptAfterTimeLimit: 30 * 1000 });

describe("Fuzzing PrecedingTagAction", () => {
    test("should not fail", {timeout: 5 * 60 * 1000}, async () => {
        const properties = [
            fc.record({ // getInput
                "default-tag": fc.string(),
                "regex": fc.stringMatching(/^\w*$/),
                "include-ref": fc.constantFrom("", "true", "false", "string"),
                "limit-tags": fc.integer({min: 0, max: 10000}).map((x) => x.toString()),
                "limit-traversal-commits": fc.integer({min: 0, max: 10000}).map((x) => x.toString()),
                "limit-traversal-tags": fc.integer({min: 0, max: 29}).map((x) => x.toString()),
                "ref": fc.string(),
                "repository": fc.stringMatching(/^\w+\/\w+$/),
                "token": fc.string()
            }),
            fc.constantFrom(() => true, () => false), // getBooleanInput
            fc.string(), // owner
            fc.string(), // repo
            fc.record({ // listCommits
                headers: fc.dictionary(fc.string(), fc.string(), { maxKeys: 30 }),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.array(
                    fc.record({
                        sha: fc.string(),
                        commit: fc.record({
                            author: fc.option(fc.record({
                                date: fc.date({noInvalidDate: true}).map((x: any) => x.toISOString())
                            })),
                            committer: fc.option(fc.record({
                                date: fc.date({noInvalidDate: true}).map((x: any) => x.toISOString())
                            }))
                        }),
                        parents: fc.array(fc.record({
                            sha: fc.string()
                        }), {maxLength: 4})
                    }),
                    {minLength: 1, maxLength: 100}
                )
            }),
            fc.record({ // listTags
                headers: fc.dictionary(fc.string(), fc.string(), { maxKeys: 30 }),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.array(fc.record({
                    name: fc.string(),
                    commit: fc.record({
                        sha: fc.string()
                    })
                }), {maxLength: 100})
            }),
            fc.record({ // compareCommitsWithBaseheadValue
                headers: fc.dictionary(fc.string(), fc.string(), { maxKeys: 30 }),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.integer().chain((number: any): any => {
                    if (number > 0) {
                        return fc.record({
                            status: fc.constantFrom("ahead", "diverged"),
                            ahead_by: fc.constant(number),
                            behind_by: fc.integer()
                        });
                    } else if (number < 0) {
                        return fc.record({
                            status: fc.constantFrom("behind", "diverged"),
                            ahead_by: fc.integer(),
                            behind_by: fc.constant(-number)
                        });
                    } else {
                        return fc.record({
                            status: fc.constant("identical"),
                            ahead_by: fc.constant(0),
                            behind_by: fc.constant(0)
                        });
                    }
                })
            }),
            fc.record({ // getCommitValue
                headers: fc.dictionary(fc.string(), fc.string(), { maxKeys: 30 }),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.record({
                    sha: fc.string(),
                    commit: fc.record({
                        author: fc.option(fc.record({
                            date: fc.date({noInvalidDate: true}).map((x: any) => x.toISOString())
                        })),
                        committer: fc.option(fc.record({
                            date: fc.date({noInvalidDate: true}).map((x: any) => x.toISOString())
                        }))
                    })
                })
            })
        ];

        const predicate = async (
            getInput: any,
            getBooleanInput: any,
            owner: any,
            repo: any,
            listCommits: any,
            listTags: any,
            compareCommitsWithBaseheadValue: any,
            getCommitValue: any) => { // eslint-disable-line max-params

            (core as any).getInput = vi.fn().mockImplementation((key) => {
                if (Object.hasOwn(getInput, key)) {
                    return getInput[key];
                }

                throw new Error(`unknown key ${key}`);
            });
            (core as any).getBooleanInput = getBooleanInput;
            context.repo.owner = owner;
            context.repo.repo = repo;
            (Octokit.prototype as any).loadCache = resolveFn;
            (Octokit.prototype as any).saveCache = resolveFn;
            (Octokit.prototype as any).rest.repos.compareCommitsWithBasehead = () => Promise.resolve(compareCommitsWithBaseheadValue);
            (Octokit.prototype as any).rest.repos.getCommit = () => Promise.resolve(getCommitValue);
            (Octokit.prototype as any).rest.repos.listCommits = (params: any) => {
                // When requesting with a sha, the first entry of a successful response will always be the commit of that SHA.
                if (Object.hasOwn(params, "sha")) {
                    listCommits.data[0].sha = params.sha;
                }

                return Promise.resolve(listCommits);
            };

            (Octokit.prototype as any).rest.repos.listTags = () => Promise.resolve(listTags);

            await PrecedingTagAction();

            let failure = false;
            for (const call of (core.setFailed as any).mock.calls) {
                failure = true;
                if (call[0] instanceof Error) {
                    // Ignore input parsing errors
                    if (call[0].message.startsWith("Invalid input")) {
                        continue;
                    }

                    throw call[0];
                }
            }

            if (failure) {
                expect(core.setFailed).toHaveBeenCalledOnce();
                expect(core.setOutput).not.toBeCalled();
            } else {
                expect(core.setFailed).not.toBeCalled();
                expect(core.setOutput).toBeCalledTimes(2);
            }
        };

        fc.assert(fc.asyncProperty.apply(null, [...properties, predicate] as any).beforeEach(() => {
            (core as any).getInput = notImplementedFn;
            (core as any).getBooleanInput = notImplementedFn;
            (core as any).setFailed = vi.fn();
            (core as any).setOutput = vi.fn();
            (core as any).warning = vi.fn();
            (context.repo.owner as any) = undefined;
            (context.repo.repo as any) = undefined;
            (Octokit.prototype as any).loadCache = rejectFn;
            (Octokit.prototype as any).saveCache = rejectFn;
            (Octokit.prototype as any).rest.repos.compareCommitsWithBasehead = notImplementedFn;
            (Octokit.prototype as any).rest.repos.getCommit = notImplementedFn;
            (Octokit.prototype as any).rest.repos.listCommits = notImplementedFn;
            (Octokit.prototype as any).rest.repos.listTags = notImplementedFn;
        }), {includeErrorInReport: true});
    });
});