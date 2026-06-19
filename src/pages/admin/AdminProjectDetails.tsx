import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bold,
  ExternalLink,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Palette,
  Quote,
  Save,
  Table2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";


import { mediaUrl, projectsApi, type Project } from "@/lib/api";
import { projectHref } from "@/lib/projectLinks";

/* ---------------- TIPTAP ---------------- */
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link as LinkExtension } from "@tiptap/extension-link";
import ImageResize from "tiptap-extension-resize-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";

/* ---------------- IMAGE SIZE BOUNDS ----------------
 * tiptap-extension-resize-image clamps drag-resize to these, and also uses
 * `maxWidth` as the width for a freshly-inserted image that's never been
 * dragged or clicked — otherwise it renders at the photo's raw natural
 * pixel size (often huge) until the user manually resizes it.
 */
const IMAGE_MIN_WIDTH = 80;
const IMAGE_MAX_WIDTH = 480;

const DEFAULT_INLINE_IMAGE_WRAPPER_STYLE =
  "display: inline-block; float: left; padding-right: 8px;";
const DEFAULT_INLINE_IMAGE_CONTAINER_STYLE =
  "width: 100%; height: auto; cursor: pointer; display: inline-block;";

/* ---------------- TYPES ---------------- */
type DetailForm = {
  slug: string;
  detail_content: string;
  detail_design: NonNullable<Project["detail_design"]>;
  detail_palette: NonNullable<Project["detail_palette"]>;
  client: string;
  status: string;
  tech_stack: string;
  impact_summary: string;
  external_url: string;
};

const emptyForm: DetailForm = {
  slug: "",
  detail_content: "",
  detail_design: "modern",
  detail_palette: "ocean",
  client: "",
  status: "Live in production",
  tech_stack: "",
  impact_summary: "",
  external_url: "",
};



const toForm = (project: Project): DetailForm => ({
  slug: project.slug || "",
  detail_content: project.detail_content || "",
  detail_design: project.detail_design || "modern",
  detail_palette: project.detail_palette || "ocean",
  client: project.client || "",
  status: project.status || "Live in production",
  tech_stack: project.tech_stack || "",
  impact_summary: project.impact_summary || "",
  external_url: project.external_url || "",
});

/**
 * tiptap-extension-resize-image persists its float/width styling as
 * `wrapperstyle` / `containerstyle` attributes on the saved <img> tag —
 * that's how *it* restores an image's layout the next time this editor
 * loads the doc (see its own parseHTML, which reads exactly those two
 * attribute names). But those are plain, non-standard HTML attributes, so
 * nothing outside Tiptap applies them as CSS. Anything that renders this
 * HTML elsewhere — the public case study page, an export, a different
 * component entirely — would silently lose the float/alignment/width and
 * show a plain, unstyled, full-size image.
 *
 * This mirrors both into a real `style` attribute before we persist the
 * content, so the layout survives anywhere the HTML ends up. It also
 * backstops images that were inserted but never dragged/clicked (so never
 * got a concrete pixel width baked into `containerstyle`) with a responsive
 * max-width, instead of leaving them unconstrained.
 */
const normalizeImageStyles = (html: string): string => {
  if (!html || typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("img").forEach((img) => {
    const wrapperStyle =
      img.getAttribute("wrapperstyle") || DEFAULT_INLINE_IMAGE_WRAPPER_STYLE;
    const containerStyle =
      img.getAttribute("containerstyle") || DEFAULT_INLINE_IMAGE_CONTAINER_STYLE;
    const existing = img.getAttribute("style") || "";

    const hasExplicitWidth = /width\s*:\s*\d/.test(containerStyle);
    const fallbackWidth = hasExplicitWidth
      ? ""
      : `width: 100%; max-width: ${IMAGE_MAX_WIDTH}px;`;

    img.setAttribute(
      "style",
      [wrapperStyle, containerStyle, fallbackWidth, existing]
        .filter(Boolean)
        .join("; ")
    );

    if (!img.getAttribute("containerstyle")) {
      img.setAttribute("containerstyle", containerStyle);
    }

    if (!img.getAttribute("wrapperstyle")) {
      img.setAttribute("wrapperstyle", wrapperStyle);
    }
  });

  return doc.body.innerHTML;
};

const AdminProjectDetails = () => {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<DetailForm>(emptyForm);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.getAll,
  });

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) || projects[0] || null,
    [projects, selectedId]
  );

  useEffect(() => {
    if (!selectedId && projects[0]) {
      setSelectedId(projects[0].id);
    }
  }, [projects, selectedId]);

  /* ---------------- IMAGE EXTENSION ----------------
   * `inline: true` here is the extension's own documented option (see its
   * `ImageResizeOptions` type) — not a hand-rolled schema override. Setting
   * it this way does two things at once:
   *   1. It flips the node's ProseMirror `inline`/`group`, via the base
   *      `@tiptap/extension-image` `inline()`/`group()` functions, which
   *      read this exact same option.
   *   2. It switches the node view's default wrapper style to
   *      `display: inline-block; float: left; padding-right: 8px;` so
   *      surrounding text actually wraps beside the image across multiple
   *      lines, and it enables the extension's built-in click-to-align
   *      controller (left/right) on top of its existing resize handles.
   *
   * Doing this by hand via `.extend({ inline: true, group: 'inline' })`
   * only ever did half of that: the schema became inline, but the node
   * view's *rendered* wrapper still used its non-inline default
   * (`display: flex; margin: 0`) because that default is derived from
   * `this.options.inline`, which a schema-level `.extend()` never touches.
   * An un-sized, block-level flex wrapper sitting inside inline content is
   * exactly what produced the oversized invisible box around images.
   */
  const ResizableImage = useMemo(
    () =>
      ImageResize.configure({
        inline: true,
        minWidth: IMAGE_MIN_WIDTH,
        maxWidth: IMAGE_MAX_WIDTH,
      }),
    []
  );

  /* ---------------- TIPTAP EDITOR ---------------- */
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      ResizableImage,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Write case study content...",
      }),
    ],

    content: "",

    onUpdate: ({ editor }) => {
      setForm((prev) => ({
        ...prev,
        detail_content: editor.getHTML(),
      }));
    },
  });

  /* ---------------- SYNC WHEN PROJECT CHANGES ---------------- */
  useEffect(() => {
    if (selected) {
      const nextForm = toForm(selected);
      setForm(nextForm);
      editor?.commands.setContent(nextForm.detail_content || "");
    }
  }, [editor, selected?.id]);

  /* ---------------- IMAGE UPLOAD ---------------- */
  const addImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const data = await projectsApi.uploadImage(formData);

        if (data.url) {
          editor?.chain().focus().setImage({ src: mediaUrl(data.url) }).run();
        } else {
          toast.error("Failed to upload image");
        }
      } catch (err) {
        toast.error("Image upload error");
      }
    };

    input.click();
  };

  const addLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste URL", previousUrl || "https://");

    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const editorButtonClass = (active = false) =>
    `inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
    }`;

  /* ---------------- SAVE ---------------- */
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) => projectsApi.update(id, data),
    onSuccess: (project) => {
      qc.setQueryData<Project[]>(["projects"], (old = []) =>
        old.map((item) => (item.id === project.id ? project : item))
      );
      qc.setQueryData(["project", project.slug || project.id], project);
      toast.success("Project details saved");
    },

    onError: (e) =>
      toast.error(
        `Save failed: ${e instanceof Error ? e.message : "error"}`
      ),
  });

  const handleSave = () => {
    if (!selected) return;
    updateMut.mutate({
      id: selected.id,
      data: {
        ...form,
        detail_content: normalizeImageStyles(form.detail_content),
        client: form.client || null,
        status: form.status || null,
        tech_stack: form.tech_stack || null,
        impact_summary: form.impact_summary || null,
        external_url: form.external_url || null,
      },
    });
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-foreground">Project Details</h1>
          {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
        </div>

        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedId(project.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${selected?.id === project.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/30 hover:bg-secondary/50"
                }`}
            >
              <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
                {project.image_url ? (
                  <img src={mediaUrl(project.image_url)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{project.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {project.category} / {project.year}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        {!selected ? (
          <div className="text-sm text-muted-foreground">No projects yet.</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">Editing</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-foreground">{selected.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={projectHref({ ...selected, slug: form.slug || selected.slug })}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-secondary"
                >
                  <ExternalLink size={15} />
                  Preview
                </Link>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMut.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {updateMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Save
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Slug</span>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">External URL</span>
                <input
                  value={form.external_url}
                  onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Client</span>
                <input
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Status</span>
                <input
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">Tech Stack</span>
                <input
                  value={form.tech_stack}
                  onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
                  placeholder="React, FastAPI, PostgreSQL"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Palette size={15} className="text-primary" />
                  Detail Design
                </span>
                <select
                  value={form.detail_design}
                  onChange={(e) =>
                    setForm({ ...form, detail_design: e.target.value as DetailForm["detail_design"] })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="modern">Modern</option>
                  <option value="brutalist">Brutalist</option>
                  <option value="pastel">Pastel</option>
                  <option value="terminal">Terminal</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Palette size={15} className="text-primary" />
                  Accent Palette
                </span>
                <select
                  value={form.detail_palette}
                  onChange={(e) =>
                    setForm({ ...form, detail_palette: e.target.value as DetailForm["detail_palette"] })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="ocean">Ocean</option>
                  <option value="sunset">Sunset</option>
                  <option value="forest">Forest</option>
                  <option value="midnight">Midnight</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Impact Summary</span>
              <textarea
                value={form.impact_summary}
                onChange={(e) => setForm({ ...form, impact_summary: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>

            <div className="rounded-xl border border-border bg-background/60">
              <div className="flex flex-wrap gap-2 border-b border-border p-3">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editorButtonClass(editor?.isActive("bold"))}
                  title="Bold"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editorButtonClass(editor?.isActive("italic"))}
                  title="Italic"
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editorButtonClass(editor?.isActive("heading", { level: 2 }))}
                  title="Heading 2"
                >
                  <Heading2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={editorButtonClass(editor?.isActive("heading", { level: 3 }))}
                  title="Heading 3"
                >
                  <Heading3 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editorButtonClass(editor?.isActive("bulletList"))}
                  title="Bulleted list"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={editorButtonClass(editor?.isActive("orderedList"))}
                  title="Numbered list"
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={editorButtonClass(editor?.isActive("blockquote"))}
                  title="Quote"
                >
                  <Quote size={15} />
                </button>
                <button type="button" onClick={addLink} className={editorButtonClass(editor?.isActive("link"))} title="Link">
                  <Link2 size={15} />
                </button>
                <button type="button" onClick={addImage} className={editorButtonClass()} title="Upload image">
                  <ImageIcon size={15} />
                </button>
                <button type="button" onClick={addTable} className={editorButtonClass()} title="Insert table">
                  <Table2 size={15} />
                </button>
              </div>

              <EditorContent
                editor={editor}
                className="admin-rich-editor border-0"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: click an inserted image to drag-resize it, or use its left/right icons so text wraps beside it.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminProjectDetails;
