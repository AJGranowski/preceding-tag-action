import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            enabled: true,
            include: ["src/**/*"],
            reporter: ["lcov", "text"]
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
        //exclude: ["**/*.fuzz.*"],
        //include: ["test/**/*"]
    }
});