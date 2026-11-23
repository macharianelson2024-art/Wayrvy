import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { BottomTabs } from "./BottomTabs";

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TopNav />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-10">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}