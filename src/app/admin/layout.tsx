import { AdminShell, type AdminNavigationGroup } from "@/components/admin/AdminShell";
import { canAccess, requireAdminPage, type AdminResource } from "@/server/auth";

export const dynamic = "force-dynamic";

const navigation = [
   { label: "Overview", href: "/admin", icon: "LayoutDashboard", resource: "dashboard" },
    { label: "Notifications", href: "/admin/notifications", icon: "Bell", resource: "notifications" },
  { label: "Orders", href: "/admin/orders", icon: "ShoppingBag", resource: "orders", group: "Operations" },
  { label: "Inventory", href: "/admin/inventory", icon: "PackageCheck", resource: "inventory", group: "Operations" },
  { label: "Delivery", href: "/admin/delivery", icon: "Truck", resource: "delivery", group: "Operations" },
  { label: "Products", href: "/admin/products", icon: "Package", resource: "catalog", group: "Catalog" },
  { label: "Product imports", href: "/admin/product-imports", icon: "Package", resource: "catalog", group: "Catalog" },
  { label: "Categories", href: "/admin/categories", icon: "Tags", resource: "catalog", group: "Catalog" },
  { label: "Media", href: "/admin/media", icon: "Image", resource: "catalog", group: "Catalog" },
  { label: "Duplicate review", href: "/admin/catalog-duplicates", icon: "CopyCheck", resource: "catalog", group: "Catalog" },
    { label: "Promotions", href: "/admin/promotions", icon: "BadgePercent", resource: "marketing", group: "Storefront" },
   { label: "Popups", href: "/admin/popups", icon: "BadgePercent", resource: "marketing", group: "Storefront" },
   { label: "Homepage", href: "/admin/homepage", icon: "PanelTop", resource: "homepage", group: "Storefront" },
  { label: "Settings", href: "/admin/settings", icon: "Settings", resource: "settings", group: "Administration" },
   { label: "Reports", href: "/admin/reports", icon: "ChartNoAxesCombined", resource: "reports", group: "Administration" },
  { label: "Customers", href: "/admin/customers", icon: "Users", resource: "users", group: "Administration" },
   { label: "Staff", href: "/admin/staff", icon: "ShieldCheck", resource: "users", group: "Administration" },
   { label: "Activity log", href: "/admin/activity-log", icon: "ScrollText", resource: "governance", group: "Administration" },
] satisfies Array<AdminNavigationGroup["items"][number] & { resource?: AdminResource; group?: string }>;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminPage();
   const visibleNavigation = navigation.filter((item) => !item.resource || canAccess(user.role, item.resource));
  const groups = visibleNavigation.reduce<AdminNavigationGroup[]>((result, { group = "", resource: _resource, ...item }) => {
    const existing = result.find((entry) => entry.label === group);
    if (existing) existing.items.push(item);
    else result.push({ label: group, items: [item] });
    return result;
  }, []);

  return <AdminShell navigation={groups} user={{ name: user.name, role: user.role }}>{children}</AdminShell>;
}
