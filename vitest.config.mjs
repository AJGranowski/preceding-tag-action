import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            enabled: true,
            include: ["src/**/*"],
            reporter: ["lcov", "text"],
            thresholds: {
                branches: 60,
                statements: 60,
                perFile: true,

                "!src/PrecedingTagAction.ts": {
                    branches: 80,
                    statements: 80
                }
            }
        },
        projects: [
            {
                test: {
                    exclude: ["**/*.fuzz.test.ts"],
                    include: ["test/**/*.test.ts"],
                    name: "unit"
                }
            },
            {
                test: {
                    include: ["test/**/*.fuzz.test.ts"],
                    name: "fuzz"
                }
            }
        ]
    }
});