import { useRef, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { useToast } from "../../context/ToastContext";

interface ImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  errors: number;
  rows: { rowNumber: number; name: string; pin: string; status: string; error?: string }[];
}

export function ImportStudentsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.show("Please choose a CSV file first", "error");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const res = await api.post("/students/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSummary(res.data.data);
      toast.show(`Imported ${res.data.data.created} students`, "success");
      onImported();
    } catch (err) {
      toast.show(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    window.open("/api/students/template", "_blank");
  }

  return (
    <Modal open onClose={onClose} title="Import Students from CSV" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-ink-400">
          Upload a CSV with columns: <span className="figure">name, pin, phone, class</span>.
          Classes that don't exist yet will be created automatically.
        </p>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          Download CSV Template
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="block w-full text-sm text-ink-400 file:mr-3 file:py-2 file:px-3 file:rounded-DEFAULT file:border-0 file:bg-ink-50 dark:file:bg-ink-700 file:text-ink dark:file:text-paper-50 file:text-sm file:font-medium"
        />
        <Button onClick={handleImport} loading={loading} className="w-full">
          Import
        </Button>

        {summary && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-4 text-sm">
              <span className="text-success font-medium">{summary.created} created</span>
              <span className="text-warn font-medium">{summary.skipped} skipped</span>
              <span className="text-danger font-medium">{summary.errors} errors</span>
            </div>
            {summary.errors > 0 && (
              <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                {summary.rows
                  .filter((r) => r.status === "ERROR")
                  .map((r) => (
                    <p key={r.rowNumber} className="text-danger">
                      Row {r.rowNumber}: {r.error}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
