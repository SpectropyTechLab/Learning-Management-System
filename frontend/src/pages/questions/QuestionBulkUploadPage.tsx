import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { QuestionFolder } from "@/types/questionFolder";

const normalizeFolder = (item: Record<string, unknown>): QuestionFolder => ({
  id: (item.id as string | number) ?? "",
  name: typeof item.name === "string" ? item.name : "Untitled Folder",
  description: typeof item.description === "string" ? item.description : "",
  questionCount: Number(item.questionCount ?? item.question_count ?? 0),
});

const splitAnswerTokens = (answer: string) =>
  new Set(
    String(answer ?? "")
      .split(/[;,|]/)
      .map((token) => token.trim().toUpperCase())
      .filter(Boolean)
  );

const renderMappedOptions = (rawOptions: string, rawAnswer: string) => {
  if (!rawOptions || rawOptions.trim() === "-") return "-";

  const options = rawOptions
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (options.length === 0) return "-";

  const answerTokens = splitAnswerTokens(rawAnswer);

  return (
    <div className="space-y-1">
      {options.map((entry, index) => {
        const label = String.fromCharCode(65 + index);
        const displayEntry = entry.replace(/^[A-Ha-h0-9]+[\)\].:-]\s*/i, "");
        const isCorrect = answerTokens.has(label) || answerTokens.has(String(index + 1));
        return (
          <div
            key={`${label}-${index}`}
            className={`flex items-start gap-2 rounded px-1.5 py-1 ${
              isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-700"
            }`}
          >
            <span className={`inline-flex min-w-4 justify-center font-semibold ${isCorrect ? "text-emerald-700" : "text-slate-500"}`}>
              {label}
            </span>
            <span dangerouslySetInnerHTML={{ __html: displayEntry }} />
          </div>
        );
      })}
    </div>
  );
};

export default function QuestionBulkUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderOptions, setFolderOptions] = useState<QuestionFolder[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadSummary, setUploadSummary] = useState<{
    type: "error";
    message: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const folderFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("folderId") ?? "";
  }, [location.search]);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const res = await api.get("/question-folders");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setFolderOptions(payload.map(normalizeFolder));
      } catch {
        setFolderOptions([]);
      }
    };
    loadFolders();
  }, []);

  const activeFolder = selectedFolder || folderFromQuery;

  const handleUpload = async () => {
    if (!bulkFile) {
      alert("Please select a file to upload.");
      return;
    }

    setUploadErrors([]);
    setUploadSummary(null);
    setUploading(true);
    try {
      const extension = bulkFile.name.split(".").pop()?.toLowerCase();
      if (extension === "docx") {
        const formData = new FormData();
        formData.append("file", bulkFile);
        if (activeFolder) formData.append("folder_id", activeFolder);

        const res = await api.post("/questions/bulk-upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.success === false || res.data?.errors?.length) {
          setUploadSummary({
            type: "error",
            message:
              typeof res.data?.message === "string"
                ? res.data.message
                : "Upload failed. No questions were inserted.",
          });
          setUploadErrors(
            Array.isArray(res.data?.errors)
              ? res.data.errors.map((err: { message?: string }) => err.message ?? String(err))
              : []
          );
        } else {
          const insertedCount = Number(res.data?.inserted ?? 0);
          alert(`Uploaded ${insertedCount} question${insertedCount === 1 ? "" : "s"} successfully.`);
          navigate("/question-bank");
        }
      } else {
        alert("CSV/XLSX upload will be supported next. Please upload a .docx file.");
      }
    } catch (error) {
      const responseData =
        typeof error === "object" && error && "response" in error
          ? (error as {
              response?: {
                data?: { error?: unknown; message?: unknown; errors?: Array<{ message?: string }> };
              };
            }).response?.data
          : null;
      const message =
        typeof responseData?.message === "string"
          ? responseData.message
          : typeof responseData?.error === "string"
            ? responseData.error
            : "Failed to upload file.";
      setUploadSummary({
        type: "error",
        message,
      });
      setUploadErrors(
        Array.isArray(responseData?.errors) && responseData.errors.length > 0
          ? responseData.errors.map((err) => err.message ?? String(err))
          : [message]
      );
    } finally {
      setUploading(false);
      setBulkFile(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/questions/bulk-upload/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "question-bank-template.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download template.");
    }
  };

  return (
    <QuestionBankLayout
      title="Bulk Upload"
      description="Upload DOCX template files to add questions in bulk, including rich text and images."
      actions={
        <button
          onClick={() => navigate("/question-bank")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">Drop your file here</p>
              <p className="mt-1 text-xs text-slate-500">Supported: .docx (table template, rich text and images supported)</p>
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Select File
                <input
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {bulkFile && (
                <div className="mt-3 text-xs text-slate-600">
                  Selected: <span className="font-semibold">{bulkFile.name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Download DOCX Template
              </button>
              <span>Use the provided table format for bulk upload.</span>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Instructions</h3>
              <p className="mt-2 text-xs text-slate-500">
                Fill the DOCX template table exactly as provided. One row = one question.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                <li>Type: mcq_single, mcq_multiple, true_false, numerical, short_answer.</li>
                <li>Question: rich text content is supported, including embedded DOCX images and tables.</li>
                <li>Equations inside DOCX content are preserved during upload when included in the template cells.</li>
                <li>Options: separate with semicolons (A;B;C;D) for MCQ.</li>
                <li>Correct Answer: use option letters (A/B/...) for MCQ, true/false for True/False, number for Numerical, and plain text for Short Answer.</li>
                <li>Question and option content can be text, image, or text+image. Image-only question/options are accepted.</li>
                <li>Solution and passage fields can also contain formatted DOCX content with images.</li>
                <li>For linked comprehension sets, keep normal child question types and set Has Comprehension = yes.</li>
                <li>Use the same Passage Key across all child questions that should share one passage.</li>
                <li>For passage-based questions, provide Passage Title and Passage Content; all rows with the same Passage Key will share that passage.</li>
                <li>Category uploads into the question `category` field. Tags upload only from the `Tags` column.</li>
                <li>Program, Grade, Subject, Chapter, Topic can be provided as IDs or names inside the file.</li>
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                If a column is not applicable, leave it empty. Uploads are atomic: if one row fails, no questions are inserted.
              </p>

              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-500">DOCX Template (Dummy Sample)</div>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border border-slate-200 px-2 py-1">Sno</th>
                        <th className="border border-slate-200 px-2 py-1">Type</th>
                        <th className="border border-slate-200 px-2 py-1">Question</th>
                        <th className="border border-slate-200 px-2 py-1">Options</th>
                        <th className="border border-slate-200 px-2 py-1">Correct Answer</th>
                        <th className="border border-slate-200 px-2 py-1">Solution</th>
                        <th className="border border-slate-200 px-2 py-1">Difficulty</th>
                        <th className="border border-slate-200 px-2 py-1">Marks+</th>
                        <th className="border border-slate-200 px-2 py-1">Marks-</th>
                        <th className="border border-slate-200 px-2 py-1">Tags</th>
                        <th className="border border-slate-200 px-2 py-1">Program</th>
                        <th className="border border-slate-200 px-2 py-1">Grade</th>
                        <th className="border border-slate-200 px-2 py-1">Subject</th>
                        <th className="border border-slate-200 px-2 py-1">Chapter</th>
                        <th className="border border-slate-200 px-2 py-1">Topic</th>
                        <th className="border border-slate-200 px-2 py-1">Has Comprehension</th>
                        <th className="border border-slate-200 px-2 py-1">Passage Key</th>
                        <th className="border border-slate-200 px-2 py-1">Passage Title</th>
                        <th className="border border-slate-200 px-2 py-1">Passage Content</th>
                        <th className="border border-slate-200 px-2 py-1">Category</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr>
                        <td className="border border-slate-200 px-2 py-1">1</td>
                        <td className="border border-slate-200 px-2 py-1">mcq_single</td>
                        <td className="border border-slate-200 px-2 py-1">What is 2 + 2?</td>
                        <td className="border border-slate-200 px-2 py-1">
                          {renderMappedOptions("A) 2;B) 3;C) 4;D) 5", "C")}
                        </td>
                        <td className="border border-slate-200 px-2 py-1">C</td>
                        <td className="border border-slate-200 px-2 py-1">2 + 2 = 4.</td>
                        <td className="border border-slate-200 px-2 py-1">easy</td>
                        <td className="border border-slate-200 px-2 py-1">4</td>
                        <td className="border border-slate-200 px-2 py-1">1</td>
                        <td className="border border-slate-200 px-2 py-1">math,arithmetic</td>
                        <td className="border border-slate-200 px-2 py-1">Catalyst</td>
                        <td className="border border-slate-200 px-2 py-1">6</td>
                        <td className="border border-slate-200 px-2 py-1">Math</td>
                        <td className="border border-slate-200 px-2 py-1">Basics</td>
                        <td className="border border-slate-200 px-2 py-1">Addition</td>
                        <td className="border border-slate-200 px-2 py-1">no</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">direct</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-2 py-1">2</td>
                        <td className="border border-slate-200 px-2 py-1">short_answer</td>
                        <td className="border border-slate-200 px-2 py-1">Water freezes at what temperature in degrees C?</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">0;zero</td>
                        <td className="border border-slate-200 px-2 py-1">At standard pressure, water freezes at 0 degrees C.</td>
                        <td className="border border-slate-200 px-2 py-1">easy</td>
                        <td className="border border-slate-200 px-2 py-1">2</td>
                        <td className="border border-slate-200 px-2 py-1">0</td>
                        <td className="border border-slate-200 px-2 py-1">science</td>
                        <td className="border border-slate-200 px-2 py-1">Spark</td>
                        <td className="border border-slate-200 px-2 py-1">7</td>
                        <td className="border border-slate-200 px-2 py-1">Science</td>
                        <td className="border border-slate-200 px-2 py-1">Physics</td>
                        <td className="border border-slate-200 px-2 py-1">States</td>
                        <td className="border border-slate-200 px-2 py-1">no</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">similar</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-2 py-1">3</td>
                        <td className="border border-slate-200 px-2 py-1">mcq_single</td>
                        <td className="border border-slate-200 px-2 py-1">What is the main idea of the passage?</td>
                        <td className="border border-slate-200 px-2 py-1">
                          {renderMappedOptions("A) Forest life;B) Ocean life;C) Desert life;D) Mountain life", "A")}
                        </td>
                        <td className="border border-slate-200 px-2 py-1">A</td>
                        <td className="border border-slate-200 px-2 py-1">The passage focuses on forest life.</td>
                        <td className="border border-slate-200 px-2 py-1">medium</td>
                        <td className="border border-slate-200 px-2 py-1">4</td>
                        <td className="border border-slate-200 px-2 py-1">1</td>
                        <td className="border border-slate-200 px-2 py-1">reading,passage</td>
                        <td className="border border-slate-200 px-2 py-1">Maestro</td>
                        <td className="border border-slate-200 px-2 py-1">8</td>
                        <td className="border border-slate-200 px-2 py-1">English</td>
                        <td className="border border-slate-200 px-2 py-1">Comprehension</td>
                        <td className="border border-slate-200 px-2 py-1">Reading</td>
                        <td className="border border-slate-200 px-2 py-1">yes</td>
                        <td className="border border-slate-200 px-2 py-1">P1</td>
                        <td className="border border-slate-200 px-2 py-1">Rainforest Reading</td>
                        <td className="border border-slate-200 px-2 py-1">Rainforests support rich biodiversity and help regulate climate.</td>
                        <td className="border border-slate-200 px-2 py-1">reference</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-2 py-1">4</td>
                        <td className="border border-slate-200 px-2 py-1">mcq_single</td>
                        <td className="border border-slate-200 px-2 py-1">{'<img src="QUESTION_IMAGE_DATA_OR_URL" alt="question-image" />'}</td>
                        <td className="border border-slate-200 px-2 py-1">
                          {renderMappedOptions(
                            '<img src="OPTION_A_IMAGE_DATA_OR_URL" alt="A" />; <img src="OPTION_B_IMAGE_DATA_OR_URL" alt="B" />; <img src="OPTION_C_IMAGE_DATA_OR_URL" alt="C" />; <img src="OPTION_D_IMAGE_DATA_OR_URL" alt="D" />',
                            "A"
                          )}
                        </td>
                        <td className="border border-slate-200 px-2 py-1">A</td>
                        <td className="border border-slate-200 px-2 py-1">Image-only question and options are valid.</td>
                        <td className="border border-slate-200 px-2 py-1">medium</td>
                        <td className="border border-slate-200 px-2 py-1">4</td>
                        <td className="border border-slate-200 px-2 py-1">1</td>
                        <td className="border border-slate-200 px-2 py-1">image,visual</td>
                        <td className="border border-slate-200 px-2 py-1">Maestro</td>
                        <td className="border border-slate-200 px-2 py-1">8</td>
                        <td className="border border-slate-200 px-2 py-1">Science</td>
                        <td className="border border-slate-200 px-2 py-1">Visual Questions</td>
                        <td className="border border-slate-200 px-2 py-1">Identification</td>
                        <td className="border border-slate-200 px-2 py-1">no</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">-</td>
                        <td className="border border-slate-200 px-2 py-1">direct</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  This table mirrors the DOCX template structure. Use the template for uploads.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Upload Settings</h3>
            <label className="mt-4 block text-xs font-semibold text-slate-500">Folder</label>
            <select
              value={activeFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Select a folder</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">Files will be linked to the selected folder.</p>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              One invalid row will fail the full file upload. No questions will be inserted until all rows pass validation.
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>

            {uploadSummary && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <p className="font-semibold">{uploadSummary.message}</p>
              </div>
            )}

            {uploadErrors.length > 0 && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <p className="font-semibold">Row errors:</p>
                <ul className="mt-1 list-disc pl-4">
                  {uploadErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </QuestionBankLayout>
  );
}
