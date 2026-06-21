import { FormEvent, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { Modal } from "../Modal";
import { Field, Input } from "../Form";
import { Button } from "../Button";
import { useToast } from "../../context/ToastContext";

export function CreateClassModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/classes", { name });
      toast.show("Class created", "success");
      onCreated();
    } catch (err) {
      toast.show(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New Class">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Class name" required hint="e.g. CSE-A">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Create Class
        </Button>
      </form>
    </Modal>
  );
}
