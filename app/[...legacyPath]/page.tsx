import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

const LEGACY_SECTION_LABELS: Record<string, string> = {
  "1.core_java": "Core Java",
  "2.spring": "Spring",
  "3.projects": "Projects",
  "3.spring_ai": "Spring AI",
  "4.advanced_frontend": "Advanced Frontend",
  "6.dsa": "DSA",
  "8.web_platform": "Web Platform",
  "9.javascript_typescript": "JavaScript TypeScript",
  "10.react_nextjs": "React Next.js",
  "11.databases": "Databases",
  "12.devops_cloud": "DevOps Cloud",
};

function titleFromSegment(segment: string): string {
  return segment
    .replace(/^\d+\./, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function legacyLabel(path: string[]): string {
  if (path.length === 0 || path[0] === "index.html") return "Learning OS";
  if (path[0] === "roadmap.html") return "Roadmap";

  const meaningful = path.filter((segment) => segment !== "index.html");
  if (meaningful.length === 0) return "Learning OS";

  const [section, ...rest] = meaningful;
  const sectionLabel = LEGACY_SECTION_LABELS[section] ?? titleFromSegment(section);
  const restLabel = rest.map(titleFromSegment).join(" · ");
  return restLabel ? `${sectionLabel} · ${restLabel}` : sectionLabel;
}

export default async function LegacyStaticRoutePage({
  params,
}: {
  params: Promise<{ legacyPath: string[] }>;
}) {
  const { legacyPath } = await params;
  const path = legacyPath.join("/");
  const isLegacyHtmlPath =
    path.endsWith(".html") || legacyPath.some((segment) => segment === "index.html");

  if (!isLegacyHtmlPath) {
    notFound();
  }

  if (path === "index.html") {
    redirect("/learning");
  }

  if (path === "roadmap.html") {
    redirect("/learning/topics?legacy=roadmap");
  }

  const label = legacyLabel(legacyPath);
  redirect(`/learning?legacy=${encodeURIComponent(path)}&topic=${encodeURIComponent(label)}`);
}
