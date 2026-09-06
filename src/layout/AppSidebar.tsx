import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  PieChart,
  BrainCircuit,
  Users,
  Award,
  ShieldAlert,
  UserCog,
  FileText,
  Video,
  LifeBuoy,
  Activity,
  User,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

type SubNavItem = {
  name: string;
  path: string;
  permission?: string;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;
  subItems?: SubNavItem[];
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    groupLabel: "Overview",
    items: [
      {
        icon: <LayoutDashboard className="size-5" />,
        name: "Dashboard",
        path: "/",
      },
      {
        icon: <PieChart className="size-5" />,
        name: "Platform Analytics",
        path: "/analytics/emotional",
        permission: "manage_users",
      },
    ],
  },
  {
    groupLabel: "AI & Intelligence",
    items: [
      {
        icon: <BrainCircuit className="size-5" />,
        name: "RAG Knowledge Base",
        path: "/ai/knowledge-base",
        permission: "manage_content",
      },
    ],
  },
  {
    groupLabel: "User Management",
    items: [
      {
        icon: <Users className="size-5" />,
        name: "App Users",
        path: "/users",
        permission: "manage_users",
      },
      {
        icon: <ShieldAlert className="size-5" />,
        name: "Restricted Users",
        path: "/users/restricted",
        permission: "manage_users",
      },
      {
        icon: <Award className="size-5" />,
        name: "Rewards & Streaks",
        path: "/users/rewards",
        permission: "manage_users",
      },
      {
        icon: <UserCog className="size-5" />,
        name: "Admin Staff & Roles",
        path: "/admin-users",
        permission: "manage_admins",
      },
    ],
  },
  {
    groupLabel: "Content Management",
    items: [
      {
        icon: <FileText className="size-5" />,
        name: "Content Management",
        permission: "manage_content",
        subItems: [
          { name: "Vision & App Content", path: "/content", permission: "manage_content" },
          { name: "Our Team", path: "/content?tab=team", permission: "manage_content" },
          { name: "Store & Products", path: "/store-management", permission: "manage_content" },
          { name: "Push Notifications", path: "/push-notifications", permission: "manage_content" },
          { name: "FAQ Management", path: "/faq", permission: "manage_content" },
        ],
      },
    ],
  },
  {
    groupLabel: "Webinar Management",
    items: [
      {
        icon: <Video className="size-5" />,
        name: "Webinars",
        path: "/webinar",
        permission: "manage_webinar",
      },
    ],
  },
  {
    groupLabel: "Support & Audit",
    items: [
      {
        icon: <LifeBuoy className="size-5" />,
        name: "Support Messages",
        path: "/support",
        permission: "manage_support",
      },
      {
        icon: <Activity className="size-5" />,
        name: "System Audit Trail",
        path: "/system/logs",
        permission: "manage_admins",
      },
    ],
  },
  {
    groupLabel: "Account",
    items: [
      {
        icon: <User className="size-5" />,
        name: "My Profile",
        path: "/profile",
      },
    ],
  },
];

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<string | null>("Content Management");
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path?: string) => {
      if (!path) return false
      const [pathname, search] = path.split("?")
      if (location.pathname !== pathname) return false
      if (!search) return !location.search
      return location.search.includes(search.replace("?", ""))
    },
    [location.pathname, location.search],
  )

  // Helper function to check if current logged in user has permission for nav item
  const checkPermission = useCallback(
    (permission?: string) => {
      if (!permission) return true;
      if (!user) return false;
      const isSuper = !user.adminRole || user.adminRole === "super_admin";
      if (isSuper) return true;

      const perms = [...(user.permissions || [])];
      if (user.adminRole === "content_manager" && !perms.includes("manage_content")) perms.push("manage_content");
      if (user.adminRole === "user_manager" && !perms.includes("manage_users")) perms.push("manage_users");
      if (user.adminRole === "webinar_manager" && !perms.includes("manage_webinar")) perms.push("manage_webinar");
      if (user.canAddUsers && !perms.includes("manage_admins")) perms.push("manage_admins");

      return perms.includes(permission);
    },
    [user]
  );

  useEffect(() => {
    // Expand submenu automatically if active path matches sub-item
    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.subItems) {
          const hasActiveChild = item.subItems.some((sub) => isActive(sub.path));
          if (hasActiveChild) {
            setOpenSubmenu(item.name);
          }
        }
      });
    });
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu) {
      if (subMenuRefs.current[openSubmenu]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [openSubmenu]: subMenuRefs.current[openSubmenu]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (name: string) => {
    setOpenSubmenu((prev) => (prev === name ? null : name));
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-6 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/" className="flex items-center gap-2">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
                MIND&apos;S AI
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                Admin
              </span>
            </div>
          ) : (
            <span className="text-sm font-extrabold text-brand-500 dark:text-brand-400">MA</span>
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar pb-10">
        <nav className="mb-6 space-y-6">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter((item) => checkPermission(item.permission));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.groupLabel}>
                <h2
                  className={`mb-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400 flex leading-[20px] ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    group.groupLabel
                  ) : (
                    <MoreHorizontal className="size-5" />
                  )}
                </h2>

                <ul className="flex flex-col gap-1">
                  {filteredItems.map((nav) => {
                    const isOpen = openSubmenu === nav.name;
                    const hasChildActive = nav.subItems?.some((sub) => isActive(sub.path));

                    return (
                      <li key={nav.name}>
                        {nav.subItems ? (
                          <>
                            <button
                              onClick={() => handleSubmenuToggle(nav.name)}
                              className={`menu-item group w-full ${
                                isOpen || hasChildActive
                                  ? "menu-item-active"
                                  : "menu-item-inactive"
                              } cursor-pointer ${
                                !isExpanded && !isHovered
                                  ? "lg:justify-center"
                                  : "lg:justify-start"
                              }`}
                            >
                              <span
                                className={`menu-item-icon-size ${
                                  isOpen || hasChildActive
                                    ? "menu-item-icon-active"
                                    : "menu-item-icon-inactive"
                                }`}
                              >
                                {nav.icon}
                              </span>
                              {(isExpanded || isHovered || isMobileOpen) && (
                                <span className="menu-item-text font-medium">{nav.name}</span>
                              )}
                              {(isExpanded || isHovered || isMobileOpen) && (
                                <ChevronDown
                                  className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                                    isOpen ? "rotate-180 text-brand-500" : ""
                                  }`}
                                />
                              )}
                            </button>

                            {(isExpanded || isHovered || isMobileOpen) && (
                              <div
                                ref={(el) => {
                                  subMenuRefs.current[nav.name] = el;
                                }}
                                className="overflow-hidden transition-all duration-300"
                                style={{
                                  height: isOpen
                                    ? `${subMenuHeight[nav.name] || 200}px`
                                    : "0px",
                                }}
                              >
                                <ul className="mt-1 space-y-1 ml-9">
                                  {nav.subItems
                                    .filter((sub) => checkPermission(sub.permission))
                                    .map((subItem) => (
                                      <li key={subItem.name}>
                                        <Link
                                          to={subItem.path}
                                          className={`menu-dropdown-item ${
                                            isActive(subItem.path)
                                              ? "menu-dropdown-item-active"
                                              : "menu-dropdown-item-inactive"
                                          }`}
                                        >
                                          {subItem.name}
                                        </Link>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : (
                          nav.path && (
                            <Link
                              to={nav.path}
                              className={`menu-item group ${
                                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                              }`}
                            >
                              <span
                                className={`menu-item-icon-size ${
                                  isActive(nav.path)
                                    ? "menu-item-icon-active"
                                    : "menu-item-icon-inactive"
                                }`}
                              >
                                {nav.icon}
                              </span>
                              {(isExpanded || isHovered || isMobileOpen) && (
                                <span className="menu-item-text font-medium">{nav.name}</span>
                              )}
                            </Link>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
