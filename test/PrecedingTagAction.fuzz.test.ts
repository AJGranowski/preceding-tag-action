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
    setFailed: () => undefined,
    setOutput: () => undefined
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
    Octokit.prototype.rest = {
        git: {
            listMatchingRefs: undefined
        },
        repos: {
            compareCommitsWithBasehead: undefined,
            getCommit: () => undefined
        }
    };

    return { Octokit };
});

fc.configureGlobal({ numRuns: Number.MAX_SAFE_INTEGER, interruptAfterTimeLimit: 30 * 1000 });

describe("Fuzzing PrecedingTagAction", () => {
    test("should not fail", {timeout: 10 * 60 * 1000}, async () => {
        const properties = [
            fc.stringMatching(/^\w*$/),
            fc.string(),
            fc.string(),
            fc.stringMatching(/^\w+\/\w+$/),
            fc.string(),
            fc.string(),
            fc.func(fc.boolean()),
            fc.string(),
            fc.string(),
            fc.record({
                headers: fc.object(),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.array(fc.record({
                    ref: fc.stringMatching(/^refs\/tags\/.+$/),
                    node_id: fc.string(),
                    url: fc.webUrl(),
                    object: fc.record({
                        type: fc.string(),
                        sha: fc.string({minLength: 40, maxLength: 40}),
                        url: fc.webUrl()
                    })
                }))
            }),
            fc.record({
                headers: fc.object(),
                status: fc.constant(200),
                url: fc.webUrl(),
                data: fc.integer().chain((number: any): any => {
                    if (number > 0) {
                        return fc.record({
                            status: fc.constantFrom("ahead", "diverged"),
                            ahead_by: fc.constant(number)
                        });
                    } else if (number < 0) {
                        return fc.record({
                            status: fc.constantFrom("behind", "diverged"),
                            behind_by: fc.constant(-number)
                        });
                    } else {
                        return fc.record({
                            status: fc.constant("identical")
                        });
                    }
                })
            }),
            fc.record({
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
            getInput_regex: any,
            getInput_includeRef: any,
            getInput_ref: any,
            getInput_repository: any,
            getInput_token: any,
            getInput_default: any,
            getBooleanInput: any,
            owner: any,
            repo: any,
            listMatchingRefsValue: any,
            compareCommitsWithBaseheadValue: any,
            getCommitValue: any) => { // eslint-disable-line max-params

            (core as any).getInput = vi.fn().mockImplementation((key) => {
                return ({
                    "regex": getInput_regex,
                    "include-ref": getInput_includeRef,
                    "ref": getInput_ref,
                    "repository": getInput_repository,
                    "token": getInput_token
                } as any)[key] ?? getInput_default;
            });
            (core as any).getBooleanInput = getBooleanInput;
            context.repo.owner = owner;
            context.repo.repo = repo;
            (Octokit.prototype as any).rest.git.listMatchingRefs = () => Promise.resolve(listMatchingRefsValue);
            (Octokit.prototype as any).rest.repos.compareCommitsWithBasehead = () => Promise.resolve(compareCommitsWithBaseheadValue);
            (Octokit.prototype as any).rest.repos.getCommit = () => Promise.resolve(getCommitValue);

            await PrecedingTagAction();
            for (const call of (core.setFailed as any).mock.calls) {
                if (call[0] instanceof Error) {
                    throw call[0];
                }
            }

            expect(core.setFailed).not.toBeCalled();
            expect(core.setOutput).toHaveBeenCalledOnce();
        };

        fc.assert(fc.asyncProperty.apply(null, [...properties, predicate] as any).beforeEach(() => {
            (core as any).getInput = () => {throw new Error("Not implemented.");};
            (core as any).getBooleanInput = () => {throw new Error("Not implemented.");};
            (core as any).setFailed = vi.fn();
            (core as any).setOutput = vi.fn();
            (context.repo.owner as any) = undefined;
            (context.repo.repo as any) = undefined;
            (Octokit.prototype as any).rest.git.listMatchingRefs = () => {throw new Error("Not implemented.");};
            (Octokit.prototype as any).rest.repos.compareCommitsWithBasehead = () => {throw new Error("Not implemented.");};
            (Octokit.prototype as any).rest.repos.getCommit = () => {throw new Error("Not implemented.");};
        }), {includeErrorInReport: true});
    });
});