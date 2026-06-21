import { FormEvent, useRef, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Field, Input } from "../Form";
import { Button } from "../Button";

export function PaymentSubmitForm({
  collectionId,
  onSubmitted,
}: {
  collectionId: string;
  onSubmitted: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [utr, setUtr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.show("Please choose a screenshot first", "error");
      return;
    }
    if (!utr.trim()) {
      toast.show("Please enter the UTR / transaction reference", "error");
      return;
    }

    const formData = new FormData();
    formData.append("screenshot", file);
    formData.append("utr", utr.trim());

    setLoading(true);
    try {
      await api.post(`/payments/${collectionId}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.show("Payment submitted for review", "success");
      setUtr("");
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      onSubmitted();
    } catch (err) {
      toast.show(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4 pt-4 border-t border-line dark:border-line-dark">
      <Field label="UTR / Transaction Reference" required hint="Found on your UPI app's payment success screen">
        <Input
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="e.g. 123456789012"
          className="figure"
          required
        />
      </Field>
      <Field label="Payment Screenshot" required>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          required
          className="block w-full text-sm text-ink-400 file:mr-3 file:py-2 file:px-3 file:rounded-DEFAULT file:border-0 file:bg-ink-50 dark:file:bg-ink-700 file:text-ink dark:file:text-paper-50 file:text-sm file:font-medium"
        />
      </Field>
      {preview && (
        <img src={preview} alt="Screenshot preview" className="max-h-48 rounded-DEFAULT border border-line dark:border-line-dark mx-auto" />
      )}
      <Button type="submit" className="w-full" loading={loading}>
        Submit for Review
      </Button>
    </form>
  );
}
