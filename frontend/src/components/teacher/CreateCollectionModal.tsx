import { FormEvent, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { Modal } from "../Modal";
import { Field, Input, Textarea } from "../Form";
import { Button } from "../Button";
import { useToast } from "../../context/ToastContext";

export function CreateCollectionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("300");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/collections", {
        name,
        amount: Number(amount),
        description: description || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      toast.show("Collection created", "success");
      onCreated();
    } catch (err) {
      toast.show(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New Fee Collection">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" required hint="e.g. Lab Fee, Farewell Fund">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Amount per student (₹)" required>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" step="0.01" required className="figure" />
        </Field>
        <Field label="Description (optional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Deadline (optional)">
          <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="datetime-local" />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Create Collection
        </Button>
      </form>
    </Modal>
  );
}
