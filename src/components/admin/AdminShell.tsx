"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgePercent, Bell, ChartNoAxesCombined, ChevronLeft, CopyCheck, Image, LayoutDashboard,
  LoaderCircle, Menu, Package, PackageCheck, PanelTop, ScrollText, Search, Settings, ShieldCheck, ShoppingBag, Tags, Truck, Users, X,
} from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const icons = { BadgePercent, Bell, ChartNoAxesCombined, CopyCheck, Image, LayoutDashboard, Package, PackageCheck, PanelTop, ScrollText, Settings, ShieldCheck, ShoppingBag, Tags, Truck, Users };
type IconName = keyof typeof icons;

export type AdminNavigationGroup = {
  label: string;
  items: Array<{ label: string; href: string; icon: IconName }>;
};

type Props = {
  children: React.ReactNode;
  navigation: AdminNavigationGroup[];
  user: { name: string; role: string };
};

function routeDetails(pathname: string, navigation: AdminNavigationGroup[]) {
  const item = navigation.flatMap((group) => group.items).sort((a, b) => b.href.length - a.href.length).find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  return item ?? { label: "Admin", href: "/admin", icon: "LayoutDashboard" as IconName };
}

export function AdminShell({ children, navigation, user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [searchResults, setSearchResults] = useState<Array<{ type: string; label: string; detail: string; href: string }>>([]);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const searchRequest = useRef(0);
  const searchController = useRef<AbortController | null>(null);
  const normalizedSearchQuery = useRef("");
  const searchDialogOpen = useRef(false);
  const cancelSearch = () => {
    searchRequest.current += 1;
    searchController.current?.abort();
    searchController.current = null;
  };
  const openSearch = () => {
    searchDialogOpen.current = true;
    setSearchOpen(true);
  };
  const closeSearch = () => {
    searchDialogOpen.current = false;
    cancelSearch();
    setSearchOpen(false);
    window.setTimeout(() => searchTrigger.current?.focus(), 0);
  };
  const updateSearchQuery = (value: string) => {
    normalizedSearchQuery.current = value.trim();
    cancelSearch();
    setSearchQuery(value);
  };
  const current = routeDetails(pathname, navigation);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("petstore-admin-sidebar-collapsed") === "true");
  }, []);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape" && searchOpen) closeSearch();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const query = searchQuery.trim();
    cancelSearch();
    if (!searchOpen || query.length < 2) {
      setSearchState("idle");
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const request = searchRequest.current;
    searchController.current = controller;
    const isCurrentSearch = () => searchRequest.current === request && searchDialogOpen.current && normalizedSearchQuery.current === query;
    const timer = window.setTimeout(async () => {
      if (!isCurrentSearch()) return;
      setSearchState("loading");
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json() as { results: Array<{ type: string; label: string; detail: string; href: string }> };
        if (!isCurrentSearch()) return;
        setSearchResults(data.results);
        setSearchState("idle");
      } catch (error) {
        if ((error as Error).name !== "AbortError" && isCurrentSearch()) {
          setSearchResults([]);
          setSearchState("error");
        }
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      if (searchController.current === controller) searchController.current = null;
    };
  }, [searchOpen, searchQuery]);
  function toggleCollapsed() {
    setCollapsed((value) => {
      window.localStorage.setItem("petstore-admin-sidebar-collapsed", String(!value));
      return !value;
    });
  }

  return (
    <div className="admin-shell min-h-screen bg-[#f7f7f5] text-[#262626]">
      <a href="#admin-main" className="sr-only z-[70] rounded bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/35 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-black/10 bg-white transition-transform duration-200 lg:z-30 lg:w-auto lg:translate-x-0 ${collapsed ? "lg:w-[76px]" : "lg:w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Admin navigation">
        <div className="flex h-16 items-center justify-between border-b border-black/10 px-4">
          <Link href="/admin" className={`font-bold text-brand ${collapsed ? "lg:hidden" : ""}`}>Pet Store Admin</Link>
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-2 hover:bg-black/5 lg:hidden" aria-label="Close navigation"><X size={20} /></button>
          <button type="button" onClick={toggleCollapsed} className="hidden rounded-md p-2 hover:bg-black/5 lg:block" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}><ChevronLeft size={20} className={collapsed ? "rotate-180" : ""} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navigation.map((group) => <div key={group.label || "main"} className="mb-5 last:mb-0">
            {group.label && <p className={`mb-2 px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8a8a86] ${collapsed ? "lg:sr-only" : ""}`}>{group.label}</p>}
            <div className="space-y-1">{group.items.map((item) => {
              const Icon = icons[item.icon];
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return <Link key={item.href} href={item.href} prefetch onMouseEnter={() => router.prefetch(item.href)} onFocus={() => router.prefetch(item.href)} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-brand text-white" : "text-[#555] hover:bg-[#f4f4f1] hover:text-[#262626]"}`}><Icon size={18} aria-hidden="true" className="shrink-0" /><span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span></Link>;
            })}</div>
          </div>)}
        </nav>
        <div className={`border-t border-black/10 p-4 text-xs text-[#777] ${collapsed ? "lg:hidden" : ""}`}>Signed in as {user.role.replaceAll("_", " ")}</div>
      </aside>
      <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? "lg:ml-[76px]" : "lg:ml-64"}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/10 bg-white/95 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-black/5 lg:hidden" aria-label="Open navigation" aria-expanded={mobileOpen}><Menu size={21} /></button><div className="min-w-0"><p className="hidden text-xs text-[#777] sm:block">Admin / {current.label}</p><h1 className="truncate text-base font-bold sm:text-lg">{current.label}</h1></div></div>
            <div className="flex items-center gap-2 sm:gap-3"><button ref={searchTrigger} type="button" onClick={openSearch} className="flex items-center gap-2 rounded-md border border-black/10 px-2.5 py-2 text-sm font-semibold text-[#555] hover:bg-black/5" aria-label="Search admin records" aria-haspopup="dialog" aria-expanded={searchOpen}><Search size={17} aria-hidden="true" /><span className="hidden sm:inline">Search</span><kbd className="hidden rounded border border-black/10 px-1 text-[10px] font-medium text-[#777] md:inline">Ctrl K</kbd></button><Link href="/" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-[#555] hover:bg-black/5 sm:block">View store</Link><span className="hidden max-w-36 truncate text-sm text-[#666] md:block">{user.name}</span><AdminLogoutButton /></div>
        </header>
        <main id="admin-main" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {searchOpen && <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/35 p-3 pt-[10vh] sm:p-6 sm:pt-[12vh]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSearch(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="admin-search-title" onKeyDown={(event) => { if (event.key !== "Tab") return; const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')); const first = focusable[0]; const last = focusable.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }} className="w-full max-w-2xl overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3"><Search size={20} className="text-[#777]" aria-hidden="true" /><label id="admin-search-title" className="sr-only" htmlFor="admin-search-input">Search admin records</label><input ref={searchInput} id="admin-search-input" value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} placeholder="Search products, orders, customers..." className="min-w-0 flex-1 bg-transparent text-base outline-none" /><button type="button" onClick={closeSearch} className="rounded p-1.5 text-[#666] hover:bg-black/5" aria-label="Close search"><X size={18} /></button></div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {searchQuery.trim().length < 2 && <p className="px-3 py-8 text-center text-sm text-[#666]">Enter at least 2 characters to search records you can access.</p>}
            {searchState === "loading" && <p className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-[#666]"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Searching...</p>}
            {searchState === "error" && <p className="px-3 py-8 text-center text-sm text-red-700">Search is unavailable. Please try again.</p>}
            {searchState === "idle" && searchQuery.trim().length >= 2 && searchResults.length === 0 && <p className="px-3 py-8 text-center text-sm text-[#666]">No matching records found.</p>}
            {searchState === "idle" && searchResults.map((result) => <Link key={`${result.type}-${result.href}-${result.label}`} href={result.href} onClick={closeSearch} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-[#f4f4f1]"><span className="rounded bg-[#f1f1ed] px-2 py-1 text-xs font-bold capitalize text-[#666]">{result.type}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{result.label}</span><span className="block truncate text-xs text-[#666]">{result.detail}</span></span></Link>)}
          </div>
        </section>
      </div>}
    </div>
  );
}
