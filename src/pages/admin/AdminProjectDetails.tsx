import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Loader2,
  Save,
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

const AdminProjectDetails = () => {
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<DetailForm>(emptyForm);

  /* ---------------- PROJECTS ---------------- */
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.getAll,
  });

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) || projects[0] || null,
    [projects, selectedId]
  );

  useEffect(() => {
    if (!selectedId && projects[0]) {
      setSelectedId(projects[0].id);
    }
  }, [projects, selectedId]);

  /* ---------------- TIPTAP EDITOR (FIXED) ---------------- */
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      ImageResize.configure({ inline: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Write case study content...",
      }),
    ],

    content: "",

    onCreate: ({ editor }) => {
      // initial load safety
      if (form.detail_content) {
        editor.commands.setContent(form.detail_content);
      }
    },

    onUpdate: ({ editor }) => {
      setForm((prev) => ({
        ...prev,
        detail_content: editor.getHTML(),
      }));
    },
  });

  /* ---------------- SYNC WHEN PROJECT CHANGES (FIXED) ---------------- */
  useEffect(() => {
    if (!selected) return;

    const data = toForm(selected);
    setForm(data);

    if (editor) {
      editor.commands.setContent(data.detail_content || "", { emitUpdate: false });
    }
  }, [selected?.id, editor]);

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
          editor
            ?.chain()
            .focus()
            .insertContent(`<img src="${mediaUrl(data.url)}" />`)
            .run();
        } else {
          toast.error("Failed to upload image");
        }
      } catch (err) {
        toast.error("Image upload error");
      }
    };

    input.click();
  };

  /* ---------------- SAVE ---------------- */
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) =>
      projectsApi.update(id, data),

    onSuccess: (project) => {
      qc.setQueryData<Project[]>(["projects"], (old = []) =>
        old.map((p) => (p.id === project.id ? project : p))
      );

      qc.setQueryData(["project", project.slug || project.id], project);

      toast.success("Project saved");
    },

    onError: (e) =>
      toast.error(
        `Save failed: ${e instanceof Error ? e.message : "error"
        }`
      ),
  });

  const handleSave = () => {
    if (!selected) return;

    updateMut.mutate({
      id: selected.id,
      data: {
        ...form,
        client: form.client || null,
        status: form.status || null,
        tech_stack: form.tech_stack || null,
        impact_summary: form.impact_summary || null,
        external_url: form.external_url || null,
      },
    });
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[320px_1fr]">

      {/* LEFT */}
      <aside className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-bold text-xl">Projects</h1>
          {isLoading && <Loader2 className="animate-spin" />}
        </div>

        <div className="space-y-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left p-3 rounded-lg border ${selected?.id === p.id
                  ? "border-primary bg-primary/10"
                  : "border-border"
                }`}
            >
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {p.category} / {p.year}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT */}
      <section className="rounded-xl border border-border bg-card p-5">

        {!selected ? (
          <p>No project selected</p>
        ) : (
          <div className="space-y-5">

            {/* HEADER */}
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold">{selected.title}</h2>

              <div className="flex gap-2">
                <Link
                  to={projectHref({
                    ...selected,
                    slug: form.slug || selected.slug,
                  })}
                  target="_blank"
                  className="px-3 py-2 border rounded"
                >
                  <ExternalLink size={14} /> Preview
                </Link>

                <button
                  onClick={handleSave}
                  disabled={updateMut.isPending}
                  className="px-3 py-2 bg-primary text-white rounded"
                >
                  {updateMut.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* SLUG */}
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="slug"
            />

            <div className="admin-rich-editor border rounded-lg p-3 space-y-3">
              {/* TOOLBAR */}
              <div className="flex gap-2 flex-wrap border-b border-border pb-3">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive("bold") ? "bg-secondary" : ""}
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive("italic") ? "bg-secondary" : ""}
                >
                  Italic
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive("bulletList") ? "bg-secondary" : ""}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={editor?.isActive("blockquote") ? "bg-secondary" : ""}
                >
                  Quote
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor?.isActive("heading", { level: 2 }) ? "bg-secondary" : ""}
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() =>
                    editor
                      ?.chain()
                      .focus()
                      .setLink({ href: prompt("URL") || "" })
                      .run()
                  }
                  className={editor?.isActive("link") ? "bg-secondary" : ""}
                >
                  Link
                </button>
                <button type="button" onClick={addImage}>
                  Image
                </button>
                <button
                  type="button"
                  onClick={() =>
                    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                  }
                >
                  Table
                </button>
              </div>

              {/* EDITOR */}
              <EditorContent 
                editor={editor} 
                className="min-h-[300px] w-full bg-background text-foreground cursor-text" 
              />
            </div>

          </div>
        )}

      </section>
    </div>
  );
};

export default AdminProjectDetails;