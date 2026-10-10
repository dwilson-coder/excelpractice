import { useEffect } from "react";
import { useStore, useSheet } from "../store";
import { useAutosave } from "../store/useAutosave";
import { Grid, FormulaBar, StatusBar } from "../components/Spreadsheet";
import PrintSheet from "../components/Spreadsheet/PrintSheet";
import MenuBar from "../components/Menu/MenuBar";
import Toolbar from "../components/Menu/Toolbar";
import ContextMenu from "../components/Menu/ContextMenu";
import Toasts from "../components/Menu/Toasts";
import DialogHost from "../components/Dialogs";
import SheetTabs from "../components/SheetTabs";
import PivotConfig from "../components/PivotTable/PivotConfig";
import { openFile, focusGrid } from "../lib/actions";

export default function Practice() {
  useAutosave();
  const title = useStore((s) => s.title);
  const setTitle = useStore((s) => s.setTitle);
  const view = useStore((s) => s.view);
  const pivotOpen = useStore((s) => s.pivot.open);
  const closePivot = useStore((s) => s.closePivot);
  const sheet = useSheet();

  useEffect(() => {
    document.title = `${title} · ExcelPractice`;
    return () => (document.title = "ExcelPractice");
  }, [title]);

  useEffect(() => {
    focusGrid();
    const warn = (e) => {
      if (useStore.getState().dirty && useStore.getState().autosaved !== "plain" && useStore.getState().autosaved !== "enc") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const onDrop = (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    e.preventDefault();
    openFile(f);
  };

  return (
    <div className="xs-app" onDragOver={(e) => e.dataTransfer?.types?.includes("Files") && e.preventDefault()} onDrop={onDrop}>
      <div className="xs-titlebar" data-print-hide>
        <input className="xs-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Workbook name" spellCheck={false} />
        <span className="xs-sheetname">{sheet.name}</span>
      </div>
      <MenuBar />
      <Toolbar />
      {view.formulaBar && <FormulaBar />}
      <div className="xs-main">
        <div className="xs-gridwrap">
          <Grid />
        </div>
        {pivotOpen && (
          <aside className="xs-pivot" data-print-hide aria-label="Pivot table">
            <PivotConfig onClose={closePivot} />
          </aside>
        )}
      </div>
      <SheetTabs />
      <StatusBar />
      <ContextMenu />
      <DialogHost />
      <Toasts />
      <PrintSheet />
    </div>
  );
}
