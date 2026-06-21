import { FormEvent, useEffect, useState } from "react";
import { api, unwrap, getErrorMessage } from "../../lib/api";
import { ClassItem } from "../../types";
import { Modal } from "../Modal";
import { Field, Input, Select } from "../Form";
import { Button } from "../Button";
import { useToast } from "../../context/ToastContext";

export function AddStudentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    unwrap<ClassItem[]>(api.get("/classes")).then((cls) => {
      setClasses(cls);
      if (cls.length > 0) setClassId(cls[0].id);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/students", { name, pin, phone: phone || undefined, classId });
      toast.show("Student added", "success");
      onCreated();
    } catch (err) {
      toast.show(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Student">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="PIN" required hint="Format: 25007-CS-001">
          <Input value={pin} onChange={(e) => setPin(e.target.value)} required className="figure" />
        </Field>
        <Field label="Phone (optional)">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </Field>
        <Field label="Class" required>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} required>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Add Student
        </Button>
      </form>
    </Modal>
  );
}
