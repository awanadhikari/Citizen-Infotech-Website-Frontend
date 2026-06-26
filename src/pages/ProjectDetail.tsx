import { useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  HeartPulse,
  Layers3,
} from "lucide-react";

import AnimatedSection from "@/components/AnimatedSection";
import GradientOrbs from "@/components/GradientOrbs";
import Layout from "@/components/Layout";
import { mediaUrl, projectsApi, type Project } from "@/lib/api";
import { projects as fallbackProjects } from "@/lib/data";
import { projectSlug } from "@/lib/projectLinks";

type DetailDesign = NonNullable<Project["detail_design"]>;
type DetailPalette = NonNullable<Project["detail_palette"]>;

const paletteTokens: Record<DetailPalette, { accent: string; bg: string; text: string }> = {
  ocean: { accent: "#0ea5e9", bg: "rgba(14, 165, 233, 0.12)", text: "#38bdf8" },
  sunset: { accent: "#f97316", bg: "rgba(249, 115, 22, 0.13)", text: "#fb923c" },
  forest: { accent: "#22c55e", bg: "rgba(34, 197, 94, 0.12)", text: "#4ade80" },
  midnight: { accent: "#a78bfa", bg: "rgba(167, 139, 250, 0.14)", text: "#c4b5fd" },
};

const projectImage = (project: Project, className: string) => (
  <div className={className}>
    {project.image_url ? (
      <img src={mediaUrl(project.image_url)} alt={project.title} className="h-full w-full object-cover" />
    ) : (
      <Code2 size={34} className="text-primary/40" />
    )}
  </div>
);

const splitTags = (value?: string | null) =>
  (value || "")
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeRichContentImages = (html: string) => {
  if (!html || typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("img[wrapperstyle], img[containerstyle]").forEach((img) => {
    const wrapperStyle = img.getAttribute("wrapperstyle") || "";
    const containerStyle = img.getAttribute("containerstyle") || "";
    const existing = img.getAttribute("style") || "";
    const hasExplicitWidth = /width\s*:\s*\d/.test(containerStyle);
    const fallbackWidth = hasExplicitWidth ? "" : "width: 100%; max-width: 480px;";

    img.setAttribute(
      "style",
      [wrapperStyle, containerStyle, fallbackWidth, existing].filter(Boolean).join("; ")
    );
  });

  return doc.body.innerHTML;
};

const RichContent = ({ project }: { project: Project }) => {
  const html = project.detail_content?.trim();
  const normalizedHtml = useMemo(() => (html ? normalizeRichContentImages(html) : ""), [html]);

  if (html) {
    return <div className="project-rich-content" dangerouslySetInnerHTML={{ __html: normalizedHtml }} />;
  }

  return (
    <div className="project-rich-content">
      <p>{project.description}</p>
    </div>
  );
};

const BackLink = () => (
  <Link
    to="/work"
    className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
  >
    <ArrowLeft size={16} />
    All projects
  </Link>
);

const ProjectAction = ({ className, style }: { project: Project; className: string; style?: CSSProperties }) => {
  return (
    <Link to="/contact" className={className} style={style}>
      Request a Demo <ArrowUpRight size={16} />
    </Link>
  );
};

const ModernDetail = ({ project }: { project: Project }) => {
  const tags = splitTags(project.tech_stack);

  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur">
      <div className="border-b border-border/60 p-8 md:p-10" style={{ backgroundColor: "var(--project-accent-bg)" }}>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Building2 size={14} style={{ color: "var(--project-accent)" }} />
          {project.category}
        </div>
        <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight text-foreground md:text-6xl">
          {project.title}
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
            <Calendar size={13} />
            {project.year}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
            <CheckCircle2 size={13} />
            {project.status || "Live in production"}
          </span>
          {project.client && (
            <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              {project.client}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-8 p-8 md:grid-cols-[1fr_280px] md:p-10">
        <div>
          <p className="text-base leading-8 text-muted-foreground">{project.description}</p>
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor: "var(--project-accent)",
                    backgroundColor: "var(--project-accent-bg)",
                    color: "var(--project-accent-text)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {projectImage(project, "flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-secondary")}
      </div>

      <div className="border-t border-border/60 p-8 md:p-10">
        <RichContent project={project} />
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <BackLink />
        <ProjectAction
          project={project}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        />
      </div>
    </article>
  );
};

const BrutalistDetail = ({ project }: { project: Project }) => (
  <article className="border-2 border-foreground bg-card shadow-[8px_8px_0_0_hsl(var(--foreground))]">
    <div className="bg-foreground p-8 text-background md:p-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: "var(--project-accent)" }}>
        {project.category} - {project.year}
      </p>
      <h1 className="mt-4 max-w-4xl font-heading text-4xl font-black leading-none md:text-6xl">
        {project.title}
      </h1>
      <div className="mt-6 h-1 w-16" style={{ backgroundColor: "var(--project-accent)" }} />
    </div>

    <div className="grid border-b-2 border-foreground md:grid-cols-2">
      {[
        ["Client", project.client || "Citizen Infotech"],
        ["Status", project.status || "Live in production"],
        ["Stack", project.tech_stack || project.category],
        ["Impact", project.impact_summary || project.description],
      ].map(([label, value], index) => (
        <div key={label} className={`p-6 md:p-8 ${index % 2 === 0 ? "md:border-r-2" : ""} border-foreground`}>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-xl font-bold" style={{ color: "var(--project-accent)" }}>
            {value}
          </p>
        </div>
      ))}
    </div>

    {projectImage(project, "flex h-72 items-center justify-center overflow-hidden border-b-2 border-foreground bg-secondary")}

    <div className="p-8 md:p-10">
      <RichContent project={project} />
    </div>

    <div className="flex flex-col border-t-2 border-foreground sm:flex-row">
      <div className="flex-1 p-5">
        <BackLink />
      </div>
      <ProjectAction
        project={project}
        className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-5 font-heading text-sm font-black uppercase tracking-[0.12em] text-primary-foreground"
      />
    </div>
  </article>
);

const PastelDetail = ({ project }: { project: Project }) => (
  <article className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-2xl shadow-primary/10">
    <div className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:p-10">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2"
        style={{ backgroundColor: "var(--project-accent-bg)", borderColor: "var(--project-accent)", color: "var(--project-accent)" }}
      >
        <HeartPulse size={26} />
      </div>
      <div>
        <h1 className="max-w-3xl font-heading text-2xl font-bold leading-tight text-foreground md:text-5xl">{project.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {[project.category, project.year, project.status || "Live"].map((chip) => (
            <span key={chip} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "var(--project-accent-bg)", color: "var(--project-accent-text)" }}>
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className="px-4 md:px-10">
      {projectImage(project, "flex w-full aspect-video md:aspect-[16/7] items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-secondary")}
    </div>

    <div className="grid gap-4 p-6 md:grid-cols-2 md:p-10">
      {[
        ["Client", project.client || "Citizen Infotech"],
        ["Stack", project.tech_stack || project.category],
        ["Year", project.year],
        ["Outcome", project.impact_summary || project.status || "In production"],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl p-4" style={{ backgroundColor: "var(--project-accent-bg)" }}>
          <p className="text-xs font-semibold opacity-70" style={{ color: "var(--project-accent-text)" }}>
            {label}
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
        </div>
      ))}
    </div>

    <div className="px-4 pb-6 md:px-10 md:pb-10">
      <RichContent project={project} />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackLink />
        <ProjectAction
          project={project}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        />
      </div>
    </div>
  </article>
); 

const TerminalDetail = ({ project }: { project: Project }) => {
  const handleCopy = () => {
    void navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <article className="overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117] text-[#e6edf3] shadow-2xl shadow-black/30">
      <div className="flex items-center gap-2 border-b border-[#30363d] bg-[#161b22] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-2 font-mono text-xs text-[#8b949e]">~/projects/{projectSlug(project)}</span>
      </div>

      <div className="space-y-6 p-6 font-mono md:p-8">
        <p className="text-sm text-[#8b949e]">$ project describe --id {project.id}</p>
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#8b949e]">title</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#e6edf3] md:text-4xl">{project.title}</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["category", project.category],
            ["year", project.year],
            ["status", project.status || "live"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-[0.15em] text-[#8b949e]">{label}</p>
              <p className="mt-1 text-sm" style={{ color: label === "status" ? "#27c93f" : "#e6edf3" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
        {projectImage(project, "flex h-72 items-center justify-center overflow-hidden rounded-md border border-[#30363d] bg-[#161b22]")}
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#8b949e]">description</p>
          <div className="terminal-rich-content mt-3">
            <RichContent project={project} />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ProjectAction
            project={project}
            className="inline-flex items-center justify-center gap-2 rounded border border-transparent px-4 py-2 text-sm font-medium text-black"
            style={{ backgroundColor: "var(--project-accent)" }}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded border px-4 py-2 text-sm"
            style={{ borderColor: "var(--project-accent)", color: "var(--project-accent)" }}
          >
            <Copy size={14} />
            Copy link
          </button>
          <Link to="/work" className="inline-flex items-center justify-center gap-2 rounded border border-[#30363d] px-4 py-2 text-sm text-[#8b949e] hover:text-[#e6edf3]">
            <ArrowLeft size={14} />
            All projects
          </Link>
        </div>
      </div>
    </article>
  );
};

const ProjectDetail = () => {
  const { projectSlug: slugOrId = "" } = useParams();

  const query = useQuery({
    queryKey: ["project", slugOrId],
    queryFn: () => projectsApi.getBySlug(slugOrId),
    retry: false,
    enabled: Boolean(slugOrId),
  });

  const fallbackProject = useMemo(
    () => fallbackProjects.find((project) => String(project.id) === slugOrId || projectSlug(project) === slugOrId),
    [slugOrId]
  );

  const project = query.data || fallbackProject;
  const design = (project?.detail_design || "modern") as DetailDesign;
  const palette = (project?.detail_palette || "ocean") as DetailPalette;
  const tokens = paletteTokens[palette] || paletteTokens.ocean;

  if (query.isLoading && !project) {
    return (
      <Layout>
        <section className="section-padding !pt-28">
          <div className="container-tight text-sm text-muted-foreground">Loading project...</div>
        </section>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <section className="section-padding !pt-28">
          <div className="container-tight">
            <BackLink />
            <h1 className="font-heading text-4xl font-bold text-foreground">Project not found</h1>
          </div>
        </section>
      </Layout>
    );
  }

  const style = {
    "--project-accent": tokens.accent,
    "--project-accent-bg": tokens.bg,
    "--project-accent-text": tokens.text,
  } as CSSProperties;

  const detail = {
    modern: <ModernDetail project={project} />,
    brutalist: <BrutalistDetail project={project} />,
    pastel: <PastelDetail project={project} />,
    terminal: <TerminalDetail project={project} />,
  }[design];

  return (
    <Layout>
      <section className="relative overflow-hidden section-padding !pt-28" style={style}>
        <GradientOrbs />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="container-tight relative">
          <AnimatedSection>
            {design !== "terminal" && <BackLink />}
            {detail}
          </AnimatedSection>
        </div>
      </section>
    </Layout>
  );
};

export default ProjectDetail;
