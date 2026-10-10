import { useStore } from "../../store";
import { FunctionsDialog, FindDialog, SizeDialog, NumberFormatDialog, ValidationDialog, CfDialog, ChartDialog } from "./DataDialogs";
import { PasswordDialog, PrivacyDialog, RenameDialog, ShortcutsDialog } from "./AppDialogs";

const MAP = {
  functions: FunctionsDialog,
  find: FindDialog,
  size: SizeDialog,
  numberFormat: NumberFormatDialog,
  validation: ValidationDialog,
  cf: CfDialog,
  chart: ChartDialog,
  password: PasswordDialog,
  privacy: PrivacyDialog,
  rename: RenameDialog,
  shortcuts: ShortcutsDialog,
};

export default function DialogHost() {
  const dialog = useStore((s) => s.dialog);
  if (!dialog) return null;
  const C = MAP[dialog.name];
  return C ? <C key={dialog.name + JSON.stringify(dialog.props)} {...dialog.props} /> : null;
}
