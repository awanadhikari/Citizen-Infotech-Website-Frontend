import { useEffect, useMemo, useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Image as ImageIcon, Loader2, Palette, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { DESIGNS, PALETTES } from "@/contexts/ThemeContext";
import { mediaUrl, projectsApi, type Project } from "@/lib/api";
import { projectHref } from "@/lib/projectLinks";

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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.254.39:8080";

class UploadAdapter {
  loader: any;
  xhr: XMLHttpRequest | null = null;

  constructor(loader: any) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(
      (file: File) =>
        new Promise((resolve, reject) => {
          const data = new FormData();
          data.append("file", file);

          this.xhr = new XMLHttpRequest();

          this.xhr.addEventListener("error", () =>
            reject("Network error during upload.")
          );
          this.xhr.addEventListener("abort", () =>
            reject("Upload aborted.")
          );
          this.xhr.addEventListener("load", () => {
            const response = this.xhr!.response;

            if (!response || this.xhr!.status >= 400) {
              return reject(
                response?.detail ||
                response?.message ||
                `Upload failed: ${this.xhr!.status}`
              );
            }

            resolve({
              default: mediaUrl(response.url),
            });
          });

          if (this.xhr.upload) {
            this.xhr.upload.addEventListener("progress", (evt) => {
              if (evt.lengthComputable) {
                this.loader.uploadTotal = evt.total;
                this.loader.uploaded = evt.loaded;
              }
            });
          }

          this.xhr.open("POST", `${API_BASE_URL}/api/projects/upload-image`, true);
          this.xhr.responseType = "json";

          const token = localStorage.getItem("auth_token");
          if (token) {
            this.xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }

          this.xhr.send(data);
        })
    );
  }

  abort() {
    if (this.xhr) {
      this.xhr.abort();
    }
  }
}

function CustomUploadAdapterPlugin(editor: any) {
  editor.plugins.get("FileRepository").createUploadAdapter = (
    loader: any
  ) => {
    return new UploadAdapter(loader);
  };
}

const editorConfig = {
  extraPlugins: [CustomUploadAdapterPlugin],
  toolbar: [
    "heading",
    "|",
    "bold",
    "italic",
    "link",
    "bulletedList",
    "numberedList",
    "|",
    "blockQuote",
    "insertTable",
    "imageUpload",
    "|",
    "imageStyle:block",
    "imageStyle:side",
    "|",
    "undo",
    "redo",
  ],
  image: {
    styles: {
      options: [
        "block",
        "side",
      ],
    },
    toolbar: [
      "imageStyle:block",
      "imageStyle:side",
      "|",
      "imageTextAlternative",
      "|",
      "linkImage",
    ],
  },
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

  useEffect(() => {
    if (selected) {
      setForm(toForm(selected));
    }
  }, [selected?.id]);

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) => projectsApi.update(id, data),
    onSuccess: (project) => {
      qc.setQueryData<Project[]>(["projects"], (old = []) =>
        old.map((item) => (item.id === project.id ? project : item))
      );
      qc.setQueryData(["project", project.slug || project.id], project);
      toast.success("Project details saved");
    },
    onError: (e) => toast.error(`Save failed: ${e instanceof Error ? e.message : "error"}`),
  });

  const handleSave = () => {
    if (!selected) return;
    updateMut.mutate({
      id: selected.id,
      data: {
        slug: form.slug,
        detail_content: form.detail_content,
        detail_design: form.detail_design,
        detail_palette: form.detail_palette,
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

        <div className="space-y-2 max-h-60 xl:max-h-none overflow-y-auto pr-1">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedId(project.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${selected?.id === project.id
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-background/40 hover:border-primary/30 hover:bg-secondary"
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

      <section className="rounded-xl border border-border bg-card p-5 md:p-6 min-w-0">
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
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Client", "client"],
                ["Status", "status"],
                ["Tech Stack", "tech_stack"],
              ].map(([label, key]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
                  <input
                    value={form[key as keyof DetailForm]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Impact Summary</span>
              <textarea
                value={form.impact_summary}
                onChange={(e) => setForm({ ...form, impact_summary: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Palette size={15} />
                  Design
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DESIGNS.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => setForm({ ...form, detail_design: design.id })}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${form.detail_design === design.id
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary"
                        }`}
                    >
                      <span className="font-medium">{design.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-foreground">Palette</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setForm({ ...form, detail_palette: palette.id })}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${form.detail_palette === palette.id
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary"
                        }`}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: palette.accent }} />
                      <span className="font-medium">{palette.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Case Study Content</label>
              <div className="admin-rich-editor overflow-hidden rounded-lg border border-border bg-background">
                <CKEditor
                  editor={ClassicEditor as any}
                  data={form.detail_content}
                  config={editorConfig}
                  onChange={(_, editor) => {
                    setForm((current) => ({ ...current, detail_content: editor.getData() }));
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminProjectDetails;