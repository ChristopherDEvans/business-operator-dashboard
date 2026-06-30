import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    niche: { type: 'string', short: 'n', default: 'base' },
    name: { type: 'string', short: 'c' },
  },
});

if (!values.name) {
  console.error("❌ ERROR: You must provide a client name with --name");
  process.exit(1);
}

const clientName = values.name;
const clientDirName = clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const rootDesktop = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'Antigravity');
const templatesDir = path.join(rootDesktop, 'Template Vault');
const outputDir = path.join(rootDesktop, 'Generated Sites', clientDirName);

// Fallback to the known roofer template if they ask for roofer and the vault doesn't have it yet.
let sourceTemplate = path.join(templatesDir, `${values.niche}-template`);
if (values.niche === 'roofer' && !fs.existsSync(sourceTemplate)) {
  sourceTemplate = path.join(rootDesktop, 'Roofers in Staffordshire', 'roofer-site-template');
}

if (!fs.existsSync(sourceTemplate)) {
  console.error(`❌ ERROR: Template for niche '${values.niche}' not found at ${sourceTemplate}.`);
  console.log("Please create a base template first.");
  process.exit(1);
}

// 1. Scaffold Directory
console.log(`🚀 Stamping out generic 80% Template for: ${clientName}...`);
if (fs.existsSync(outputDir)) {
  console.error("❌ ERROR: A site for this client already exists.");
  process.exit(1);
}

fs.cpSync(sourceTemplate, outputDir, { recursive: true });
console.log(`✅ Base template cloned to ${outputDir}`);

// 2. Remove old .git
const gitPath = path.join(outputDir, '.git');
if (fs.existsSync(gitPath)) {
  fs.rmSync(gitPath, { recursive: true, force: true });
}

// 3. Personalize index.html
const indexHtmlPath = path.join(outputDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');
  html = html.replace(/<title>.*?<\/title>/, `<title>${clientName}</title>`);
  html = html.replace(/<meta name="description" content=".*?"/, `<meta name="description" content="Premium website built for ${clientName}"`);
  fs.writeFileSync(indexHtmlPath, html);
  console.log("✅ index.html Personalized!");
}

// 4. Personalize package.json
const pkgPath = path.join(outputDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = clientDirName;
  pkg.description = `Website for ${clientName}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log("✅ package.json updated.");
}

// 5. Initialize Fresh Git
try {
  execSync('git init', { cwd: outputDir, stdio: 'ignore' });
  console.log("✅ Fresh git repository initialized.");
} catch (e) {
  console.warn("⚠️ Git init failed (maybe git is not installed globally).");
}

console.log("\n🎉 STAMPING COMPLETE!");
console.log(`Target: ${outputDir}`);
console.log("Next steps: 'npm install' and weave in the customized CodeGrid components!");
