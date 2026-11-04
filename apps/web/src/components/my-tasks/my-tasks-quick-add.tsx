import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useCreateTask from "@/hooks/mutations/task/use-create-task";
import useEnsurePersonalProject from "@/hooks/mutations/project/use-ensure-personal-project";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { toast } from "@/lib/toast";

const PERSONAL = "__personal__";

type MyTasksQuickAddProps = { workspaceId: string; currentUserId: string };

export function MyTasksQuickAdd({
  workspaceId,
  currentUserId,
}: MyTasksQuickAddProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState(PERSONAL);
  const { data: projects } = useGetProjects({ workspaceId });
  const ensurePersonal = useEnsurePersonalProject();
  const createTask = useCreateTask();

  const workProjects = (projects ?? []).filter((p) => !p.ownerUserId);
  const items = [
    { value: PERSONAL, label: t("workspace:myTasks.quickAdd.personal") },
    ...workProjects.map((p) => ({ value: p.id, label: p.name })),
  ];
  const pending = ensurePersonal.isPending || createTask.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    try {
      // The personal project is created on the first personal task.
      const projectId =
        destination === PERSONAL
          ? (await ensurePersonal.mutateAsync(workspaceId)).id
          : destination;
      await createTask.mutateAsync({
        projectId,
        title: trimmed,
        description: "",
        status: "to-do",
        priority: "no-priority",
        userId: currentUserId,
      });
      setTitle("");
    } catch {
      toast.error(t("workspace:myTasks.quickAdd.error"));
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-border/50 border-b px-5 py-2"
    >
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label={t("workspace:myTasks.quickAdd.label")}
        placeholder={t("workspace:myTasks.quickAdd.placeholder")}
        size="sm"
      />
      <Select
        items={items}
        value={destination}
        onValueChange={(next) => {
          if (typeof next === "string" && next) setDestination(next);
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-48 shrink-0"
          aria-label={t("workspace:myTasks.quickAdd.destination")}
        >
          <SelectValue>
            {items.find((item) => item.value === destination)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <Button type="submit" size="sm" disabled={!title.trim() || pending}>
        {t("workspace:myTasks.quickAdd.add")}
      </Button>
    </form>
  );
}
