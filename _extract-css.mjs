import fs from "fs";
const css = fs.readFileSync(
  "C:/Users/ProdeumAseris/.cursor/projects/c-Users-ProdeumAseris-Desktop-VisajTech/agent-tools/e84e3cbc-f9f0-4147-afec-630755c05919.txt",
  "utf8",
);
const rules = css
  .split("}")
  .map((s) => s.trim() + "}")
  .filter((s) => /\.fh|page-founder|#visaj/.test(s));
fs.writeFileSync("C:/Users/ProdeumAseris/Desktop/VisajTech/visaj-3d/_prod-fh.css", rules.join("\n\n"));
console.log("rules", rules.length);
