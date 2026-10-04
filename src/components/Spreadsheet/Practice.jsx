import { Spreadsheet } from "../components/Spreadsheet";
import SheetTabs from "../components/SheetTabs/SheetTabs";
import Ribbon from "../components/Ribbon/Ribbon";

export default function Practice() {
  // …ribbon config, pivot logic stay the same…

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Ribbon /* … */ />
      <Spreadsheet />
      <SheetTabs />
      {/* Pivot slide-over */}
    </div>
  );
}   