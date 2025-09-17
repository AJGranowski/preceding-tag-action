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

type core_getBooleanInput = typeof getBooleanInputType;
type core_getInput = typeof getInputType;
type github_context = typeof contextType;

// https://github.com/actions/toolkit/blob/f58042f9cc16bcaa87afaa86c2974a8c771ce1ea/packages/core/src/core.ts#L188-L208
function makeGetBooleanInput(getInput: core_getInput): core_getBooleanInput {
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
    describe("getFilter", () => {
        test("should return a non-zero match-all regular expression on an empty input", () => {
            const getInput = vi.fn().mockReturnValue("");
            const getBooleanInput = makeGetBooleanInput(getInput);
            const context = mock<github_context>({});
            const input = new Input(getInput, getBooleanInput, context);
            const regex = input.getFilter();
            expect(regex.test("")).toBe(false);
            expect(regex.test("a1-.")).toBe(true);
        });
    });
});