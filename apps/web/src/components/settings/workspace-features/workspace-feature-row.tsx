import { type ReactNode, useId } from "react";
import { SettingsRow } from "@/components/settings/settings-row";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type WorkspaceFeatureRowProps = {
  title: ReactNode;
  description: ReactNode;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function WorkspaceFeatureRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: WorkspaceFeatureRowProps) {
  const id = useId();

  return (
    <SettingsRow
      className="flex-row items-center gap-6"
      title={<Label htmlFor={id}>{title}</Label>}
      description={description}
    >
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </SettingsRow>
  );
}
