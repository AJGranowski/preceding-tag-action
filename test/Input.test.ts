import {
    describe,
    expect,
    test,
    vi
} from "vitest";

import { mock } from "vitest-mock-extended";
import type { context as contextType } from "@actions/github";
import type { getBooleanInput as getBooleanInputType, getInput as getInputType } from "@actions/core";

import { Input } from "../src/Input";

type Core_getBooleanInput = typeof getBooleanInputType;
type Core_getInput = typeof getInputType;
type Github_context = typeof contextType;

// https://github.com/actions/toolkit/blob/f58042f9cc16bcaa87afaa86c2974a8c771ce1ea/packages/core/src/core.ts#L188-L208
function makeGetBooleanInput(getInput: Core_getInput): Core_getBooleanInput {
    const trueValue = ["true", "True", "TRUE"];
    const falseValue = ["false", "False", "FALSE"];
    return (name, options) => {
        const val = getInput(name, options);
        if (trueValue.includes(val)) return true;
        if (falseValue.includes(val)) return false;
        throw new TypeError(
            `Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` +
            "Support boolean input list: `true | True | TRUE | false | False | FALSE`"
        );
    };
}

describe("Input", () => {
    describe("getDefaultTag", () => {
        test("should not warn if there is no input", () => {
            const getInput = vi.fn().mockReturnValue("");
            const warning = vi.fn();
            const input = new Input(getInput, vi.fn(), warning, mock<Github_context>({}));
            expect(input.getDefaultTag()).toBe("");
            expect(warning).not.toBeCalled();
        });

        test("should warn if default tag does not match regex", () => {
            const getInput = vi.fn().mockImplementation((input) => {
                return ({
                    "default-tag": "abc",
                    "regex": "^\\d+$"
                } as any)[input];
            });

            const warning = vi.fn();
            const input = new Input(getInput, vi.fn(), warning, mock<Github_context>({}));
            expect(input.getDefaultTag()).toBe("abc");
            expect(warning).toHaveBeenCalledOnce();
        });
    });

    describe("getFilter", () => {
        test("should return a non-zero match-all regular expression on an empty input", () => {
            const getInput = vi.fn().mockReturnValue("");
            const getBooleanInput = makeGetBooleanInput(getInput);
            const input = new Input(getInput, getBooleanInput, vi.fn(), mock<Github_context>({}));
            const filter = input.getFilter();
            expect(filter("")).toBe(false);
            expect(filter("a1-.")).toBe(true);
        });
    });

    describe("getRef", () => {
        test("should fail on .. input", () => {
            const getInput = vi.fn().mockReturnValue("..");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRef()).toThrowError(/^Invalid input ref /);
        });

        test("should fail on ./ input", () => {
            const getInput = vi.fn().mockReturnValue("./");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRef()).toThrowError(/^Invalid input ref /);
        });

        test("should fail on input beginning with .", () => {
            const getInput = vi.fn().mockReturnValue(".abc");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRef()).toThrowError(/^Invalid input ref /);
        });

        test("should fail on input ending with .", () => {
            const getInput = vi.fn().mockReturnValue("abc.");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRef()).toThrowError(/^Invalid input ref /);
        });

        test("should fail on input containing &", () => {
            const getInput = vi.fn().mockReturnValue("someref&foo");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRef()).toThrowError(/^Invalid input ref /);
        });
    });

    describe("getRepository", () => {
        test("should return owner and repo", () => {
            const getInput = vi.fn().mockReturnValue("AJGranowski/preceding-tag-action");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(input.getRepository()).toEqual({
                owner: "AJGranowski",
                repo: "preceding-tag-action"
            });
        });

        test("should not fail if repo name contains two ..", () => {
            const getInput = vi.fn().mockReturnValue("AJGranowski/some..repo");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(input.getRepository()).toEqual({
                owner: "AJGranowski",
                repo: "some..repo"
            });
        });

        test("should fail on repo name .", () => {
            const getInput = vi.fn().mockReturnValue("AJGranowski/.");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRepository()).toThrowError(/^Invalid input repository /);
        });

        test("should fail on repo name ..", () => {
            const getInput = vi.fn().mockReturnValue("AJGranowski/..");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRepository()).toThrowError(/^Invalid input repository /);
        });

        test("should fail if there is no /", () => {
            const getInput = vi.fn().mockReturnValue("AJGranowski");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRepository()).toThrowError(/^Invalid input repository /);
        });

        test("should fail if there is only /", () => {
            const getInput = vi.fn().mockReturnValue("/");
            const input = new Input(getInput, vi.fn(), vi.fn(), mock<Github_context>({}));
            expect(() => input.getRepository()).toThrowError(/^Invalid input repository /);
        });
    });

    describe("memoization", () => {
        test("should only call getInput once for each input", () => {
            const getInput = vi.fn().mockReturnValue("");
            const getBooleanInput = makeGetBooleanInput(getInput);
            const input = new Input(getInput, getBooleanInput, vi.fn(), mock<Github_context>({}));
            const callEveryGetMethod = () => {
                input.getDefaultTag();
                input.getFilter();
                input.getIncludeRef();
                input.getRef();
                input.getRepository();
                input.getToken();
            };

            callEveryGetMethod();
            const initialCallCount = getInput.mock.calls.length;
            expect(getInput).toBeCalledTimes(initialCallCount);
            callEveryGetMethod();
            callEveryGetMethod();
            callEveryGetMethod();
            expect(getInput).toBeCalledTimes(initialCallCount);
        });
    });
});