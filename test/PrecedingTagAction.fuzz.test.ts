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

    Octokit.prototype.rest = {
        repos: {
            compareCommitsWithBasehead: undefined,
            getCommit: undefined,
            listTags: undefined
        }
    };

    return { Octokit };
});

fc.configureGlobal({ numRuns: Number.MAX_SAFE_INTEGER, interruptAfterTimeLimit: 30 * 1000 });

describe("Fuzzing PrecedingTagAction", () => {
    test("should not fail", {timeout: 10 * 60 * 1000}, async () => {
        const properties = [
            fc.record({ // getInput
                "default-tag": fc.string(),
                "regex": fc.stringMatching(/^\w*$/),
                "include-ref": fc.constantFrom("", "true", "false", "string"),
                "ref": fc.string(),
                "repository": fc.stringMatching(/^\w+\/\w+$/),
                "token": fc.string()
            }),
            fc.func(fc.boolean()), // getBooleanInput
            fc.string(), // owner
            fc.string(), // repo
            fc.record({ // listTags
                headers: fc.object(),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.array(fc.record({
                    tag: fc.string(),
                    commit: fc.record({
                        sha: fc.string()
                    })
                }))
            }),
            fc.record({ // compareCommitsWithBaseheadValue
                headers: fc.object(),
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
                headers: fc.object(),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.record({
                    commit: fc.record({
                        author: fc.option(fc.record({
                            date: fc.date({noInvalidDate: true}).chain((x: any) => fc.constant(x.toISOString()))
                        })),
                        committer: fc.option(fc.record({
                            date: fc.date({noInvalidDate: true}).chain((x: any) => fc.constant(x.toISOString()))
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
            listTags: any,
            compareCommitsWithBaseheadValue: any,
            getCommitValue: any) => { // eslint-disable-line max-params

            (core as any).getInput = vi.fn().mockImplementation((key) => {
                if (key in getInput) {
                    return getInput[key];
                }

                throw new Error(`unknown key ${key}`);
            });
            (core as any).getBooleanInput = getBooleanInput;
            context.repo.owner = owner;
            context.repo.repo = repo;
            (Octokit.prototype as any).rest.repos.compareCommitsWithBasehead = () => Promise.resolve(compareCommitsWithBaseheadValue);
            (Octokit.prototype as any).rest.repos.getCommit = () => Promise.resolve(getCommitValue);
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
            (core as any).getInput = () => {throw new Error("Not implemented.");};
            (core as any).getBooleanInput = () => {throw new Error("Not implemented.");};
            (core as any).setFailed = vi.fn();
            (core as any).setOutput = vi.fn();
            (core as any).warning = vi.fn();
            (context.repo.owner as any) = undefined;
            (context.repo.repo as any) = undefined;
            (Octokit.prototype as any).rest.repos.compareCommitsWithBasehead = () => {throw new Error("Not implemented.");};
            (Octokit.prototype as any).rest.repos.getCommit = () => {throw new Error("Not implemented.");};
            (Octokit.prototype as any).rest.repos.listTags = () => {throw new Error("Not implemented.");};
        }), {includeErrorInReport: true});
    });
});