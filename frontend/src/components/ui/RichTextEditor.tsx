import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import "katex/dist/katex.min.css";
import katex from "katex";
import { ensureMathJax } from "@/components/ui/mathjax";

export type RichTextValue = {
  html: string;
  json?: unknown;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineMath: {
      insertInlineMath: (latex: string) => ReturnType;
    };
  }
}

interface RichTextEditorProps {
  value: RichTextValue | string;
  onChange: (value: RichTextValue) => void;
  placeholder?: string;
  height?: number;
  resizable?: boolean;
}

const normalizeValue = (value: RichTextValue | string | null | undefined): RichTextValue => {
  if (!value) return { html: "", json: null };
  if (typeof value === "string") return { html: value, json: null };
  const html = typeof value.html === "string" ? value.html : "";
  return { html, json: value.json ?? null };
};

const createInlineMathExtension = (
  onEdit: (latex: string, apply: (next: string) => void) => void
) =>
  Node.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-latex") ??
          element.getAttribute("latex") ??
          "",
        renderHTML: (attributes) => ({
          "data-latex": attributes.latex,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-inline-math="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const latex = String(HTMLAttributes.latex ?? "");
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-inline-math": "true",
        "data-latex": latex,
      }),
      `\\(${latex}\\)`,
    ];
  },
  addCommands() {
    return {
      insertInlineMath:
        (latex: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { latex },
          }),
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node;
      const dom = document.createElement("span");
      dom.className = "inline-math";
      dom.setAttribute("data-inline-math", "true");

      const render = () => {
        dom.innerHTML = "";
        const latex = String(currentNode.attrs.latex ?? "");
        dom.setAttribute("data-latex", latex);
        const container = document.createElement("span");
        try {
          katex.render(latex, container, { throwOnError: false });
        } catch (error) {
          container.textContent = latex;
        }
        dom.appendChild(container);
      };

      render();

      dom.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onEdit(String(currentNode.attrs.latex ?? ""), (next) => {
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              const pos = typeof getPos === "function" ? getPos() : null;
              if (typeof pos !== "number") return false;
              tr.setNodeMarkup(pos, undefined, { latex: next });
              return true;
            })
            .run();
        });
      });

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== "inlineMath") return false;
          currentNode = updatedNode;
          render();
          return true;
        },
      };
    };
  },
});

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },
});

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = 180,
  resizable = true,
}: RichTextEditorProps) {
  const latestValueRef = useRef<RichTextValue>(normalizeValue(value));
  const onChangeRef = useRef(onChange);
  const [mathModal, setMathModal] = useState<{
    open: boolean;
    value: string;
    onSave: ((latex: string) => void) | null;
  }>({ open: false, value: "", onSave: null });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const content = useMemo(() => {
    const normalized = normalizeValue(value);
    if (normalized.json && typeof normalized.json === "object") {
      return normalized.json as Record<string, unknown>;
    }
    return normalized.html || "";
  }, [value]);

  const openMathModal = useCallback((latex: string, onSave: (next: string) => void) => {
    setMathModal({ open: true, value: latex, onSave });
  }, []);

  const inlineMath = useMemo(() => createInlineMathExtension(openMathModal), [openMathModal]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      inlineMath,
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    content,
    onUpdate({ editor }) {
      const nextValue: RichTextValue = {
        html: editor.getHTML(),
        json: editor.getJSON(),
      };
      latestValueRef.current = nextValue;
      onChangeRef.current(nextValue);
    },
  });

  useEffect(() => {
    ensureMathJax();
  }, []);

  useEffect(() => {
    if (!editor) return;
    const normalized = normalizeValue(value);
    const last = latestValueRef.current;
    if (normalized.html !== last.html || normalized.json !== last.json) {
      const nextContent = normalized.json ?? normalized.html ?? "";
      editor.commands.setContent(nextContent, false);
      latestValueRef.current = normalized;
    }
  }, [value, editor]);

  const handleInsertLatex = () => {
    if (!editor) return;
    openMathModal("", (next) => {
      if (!next.trim()) return;
      editor.chain().focus().insertInlineMath(next.trim()).run();
    });
  };

  const handleCloseMathModal = () => {
    setMathModal({ open: false, value: "", onSave: null });
  };

  const handleSaveMathModal = () => {
    if (!mathModal.onSave) {
      handleCloseMathModal();
      return;
    }
    const next = mathModal.value.trim();
    if (!next) {
      handleCloseMathModal();
      return;
    }
    mathModal.onSave(next);
    handleCloseMathModal();
  };

  const handleAddImage = () => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result || "");
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleResizeImage = () => {
    if (!editor || !editor.isActive("image")) return;
    const currentAttributes = editor.getAttributes("image") as {
      width?: string | number | null;
      height?: string | number | null;
    };
    const nextWidth = window.prompt(
      "Enter image width in px or % (leave blank to reset)",
      currentAttributes.width ? String(currentAttributes.width) : ""
    );
    if (nextWidth === null) return;
    const trimmedWidth = nextWidth.trim();

    const nextHeight = window.prompt(
      "Enter image height in px (leave blank for auto)",
      currentAttributes.height ? String(currentAttributes.height) : ""
    );
    if (nextHeight === null) return;
    const trimmedHeight = nextHeight.trim();

    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        width: trimmedWidth || null,
        height: trimmedHeight || null,
      })
      .run();
  };

  const handleAddTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleAddColumnBefore = () => {
    if (!editor) return;
    editor.chain().focus().addColumnBefore().run();
  };

  const handleAddColumnAfter = () => {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
  };

  const handleDeleteColumn = () => {
    if (!editor) return;
    editor.chain().focus().deleteColumn().run();
  };

  const handleAddRowBefore = () => {
    if (!editor) return;
    editor.chain().focus().addRowBefore().run();
  };

  const handleAddRowAfter = () => {
    if (!editor) return;
    editor.chain().focus().addRowAfter().run();
  };

  const handleDeleteRow = () => {
    if (!editor) return;
    editor.chain().focus().deleteRow().run();
  };

  const handleDeleteTable = () => {
    if (!editor) return;
    editor.chain().focus().deleteTable().run();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={
              editor?.isActive("heading", { level: 1 })
                ? "h1"
                : editor?.isActive("heading", { level: 2 })
                ? "h2"
                : editor?.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
            }
            onChange={(event) => {
              const next = event.target.value;
              if (next === "p") {
                editor?.chain().focus().setParagraph().run();
              } else {
                const level = Number(next.replace("h", ""));
                editor?.chain().focus().toggleHeading({ level }).run();
              }
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Underline
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Strike
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Bullet
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Numbered
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Quote
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleCode().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Code Block
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleSubscript().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Sub
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleSuperscript().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Sup
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Left
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Center
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Right
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Justify
          </button>
          <button
            type="button"
            onClick={handleAddTable}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Table
          </button>
          <button
            type="button"
            onClick={handleAddColumnBefore}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Col +
          </button>
          <button
            type="button"
            onClick={handleAddColumnAfter}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            + Col
          </button>
          <button
            type="button"
            onClick={handleDeleteColumn}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Col -
          </button>
          <button
            type="button"
            onClick={handleAddRowBefore}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Row +
          </button>
          <button
            type="button"
            onClick={handleAddRowAfter}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            + Row
          </button>
          <button
            type="button"
            onClick={handleDeleteRow}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Row -
          </button>
          <button
            type="button"
            onClick={handleDeleteTable}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-rose-700 hover:border-rose-300 hover:bg-rose-50"
          >
            Delete Table
          </button>
          <button
            type="button"
            onClick={handleAddImage}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Image
          </button>
          <button
            type="button"
            onClick={handleResizeImage}
            disabled={!editor?.isActive("image")}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resize Image
          </button>
          <button
            type="button"
            onClick={() => {
              if (!editor) return;
              const previousUrl = editor.getAttributes("link").href as string | undefined;
              const url = window.prompt("Enter URL", previousUrl ?? "");
              if (url === null) return;
              if (!url) {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                return;
              }
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().unsetLink().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Unlink
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          >
            Redo
          </button>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          onClick={handleInsertLatex}
        >
          Insert Equation
        </button>
      </div>
      <div className="px-2 py-2">
        <EditorContent
          editor={editor}
          className="prose max-w-none text-sm text-slate-800"
          style={{
            minHeight: `${height}px`,
            resize: resizable ? "vertical" : "none",
            overflow: "auto",
          }}
        />
      </div>
      {mathModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Insert Equation</h3>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-500">LaTeX</label>
              <textarea
                value={mathModal.value}
                onChange={(event) => setMathModal((prev) => ({ ...prev, value: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                style={{ minHeight: "120px", resize: "vertical" }}
                placeholder="e.g. \\frac{a}{b} + x^2"
              />
            </div>
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-500">Preview</div>
              <div
                className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
                dangerouslySetInnerHTML={{
                  __html: mathModal.value.trim()
                    ? katex.renderToString(mathModal.value, { throwOnError: false })
                    : "<span class='text-slate-400'>Type LaTeX to preview</span>",
                }}
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseMathModal}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMathModal}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
