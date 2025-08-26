import * as esbuild from "esbuild";
import { rm } from "fs/promises";

await rm("dist", {
    recursive: true
});

await esbuild.build({
    bundle: true,
    entryPoints: ["src/index.ts"],
    outdir: "dist",
    platform: "neutral"
});