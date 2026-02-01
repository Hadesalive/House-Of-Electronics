import React, { useState } from "react";

import {
    ChevronDownIcon,
    ChevronRightIcon,
    Bars3Icon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
// Tabler Icons - Clean and unique design
import {
    IconLayoutDashboard,
    IconDashboard,
    IconShoppingCart,
    IconFileText,
    IconClipboardList,
    IconCurrencyDollar,
    IconRefresh,
    IconCube,
    IconTag,
    IconUsers,
    IconChartBar,
    IconSettings,
    IconCloud,
    IconUserCog,
    IconFileDescription,
} from '@tabler/icons-react';
import { useTheme } from "@/contexts/ThemeContext";

// Types for sidebar items
interface SubMenuItem {
    id: string;
    name: string;
}

interface SubMenuCategory {
    id: string;
    name: string;
    icon: React.ComponentType<any>;
    subMenus: SubMenuItem[];
}

interface SidebarItem {
    name: string;
    icon: React.ComponentType<any>;
    subMenus?: SubMenuCategory[];
}

// Organized sidebar items with groups
export const sidebarGroups: Array<{
    label: string | null;
    items: SidebarItem[];
}> = [
        {
            label: null, // Main section, no label
            items: [
                { name: "Dashboard", icon: IconDashboard },
                { name: "Overview", icon: IconLayoutDashboard },
            ]
        },
        {
            label: "Sales & Finance",
            items: [
                { name: "Sales", icon: IconShoppingCart },
                { name: "Invoices", icon: IconFileText },
                { name: "Orders", icon: IconClipboardList },
                { name: "BOQ", icon: IconFileDescription },
                { name: "Customer Debts", icon: IconCurrencyDollar },
                { name: "Returns", icon: IconRefresh },
            ]
        },
        {
            label: "Inventory",
            items: [
                { name: "Products", icon: IconCube },
                { name: "Inventory", icon: IconTag },
            ]
        },
        {
            label: "People",
            items: [
                { name: "Customers", icon: IconUsers },
            ]
        },
        {
            label: "System",
            items: [
                { name: "Reports", icon: IconChartBar },
                { name: "Sync", icon: IconCloud },
                { name: "Settings", icon: IconSettings },
            ]
        },
    ];

// Flattened for backward compatibility
export const defaultSidebarItems = sidebarGroups.flatMap(group => group.items);

export function DashboardSidebar({
    active,
    onSelect,
    items = defaultSidebarItems,
    drawer = false,
    collapsed: externalCollapsed,
    onCollapseToggle,
}: {
    active: string;
    onSelect: (name: string) => void;
    items?: SidebarItem[];
    drawer?: boolean;
    collapsed?: boolean;
    onCollapseToggle?: () => void;
}) {
    const { theme } = useTheme();
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [expandedSubItems, setExpandedSubItems] = useState<Set<string>>(new Set());

    const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
    const handleCollapseToggle = onCollapseToggle || (() => setInternalCollapsed(!internalCollapsed));


    const wrapperClasses = drawer
        ? "px-2 pt-2 pb-4 h-full overflow-auto flex flex-col"
        : `px-2 lg:px-3 h-full overflow-y-auto pt-2.5 border-r flex flex-col transition-all duration-300 ${collapsed && !drawer ? 'w-16' : 'w-64'
        }`;

    const toggleExpanded = (itemName: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemName)) {
            newExpanded.delete(itemName);
            // Also collapse any expanded sub-items
            const newExpandedSub = new Set(expandedSubItems);
            const item = items.find(i => i.name === itemName);
            if (item?.subMenus) {
                item.subMenus.forEach(subMenu => {
                    newExpandedSub.delete(subMenu.id);
                });
            }
            setExpandedSubItems(newExpandedSub);
        } else {
            newExpanded.add(itemName);
        }
        setExpandedItems(newExpanded);
    };


    const handleItemClick = (item: SidebarItem) => {
        if (item.subMenus) {
            toggleExpanded(item.name);
        } else {
            onSelect(item.name);
        }
    };


    const renderSubMenus = (subMenus: SubMenuCategory[]) => {
        return subMenus.map((subMenu) => {
            const isActive = active === subMenu.name;

            return (
                <div key={subMenu.id}>
                    <button
                        onClick={() => onSelect(subMenu.name)}
                        className={`relative w-full flex items-center gap-2 py-1.5 rounded-md text-left transition-all duration-200 pl-6 pr-2 hover:bg-[var(--muted)]`}
                        style={{
                            backgroundColor: isActive ? 'var(--muted)' : 'transparent',
                            color: isActive ? 'var(--accent)' : 'var(--foreground)'
                        }}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {subMenu.icon && (
                            <subMenu.icon
                                className="h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200"
                                style={{ color: isActive ? 'var(--accent)' : 'var(--muted-foreground)' }}
                            />
                        )}
                        <span className={`text-xs transition-colors duration-200 truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
                            {subMenu.name}
                        </span>
                    </button>
                </div>
            );
        });
    };

    return (
        <aside
            className={wrapperClasses}
            style={{
                borderColor: drawer ? undefined : 'var(--color-border)',
                background: 'var(--background)'
            }}
        >
            {/* Header */}
            <div className={`flex flex-col items-center justify-center mb-3 px-2 py-3 border-b flex-shrink-0 relative ${collapsed && !drawer ? 'px-1' : ''}`} style={{ borderColor: 'var(--border)' }}>
                {!drawer && (
                    <button
                        onClick={handleCollapseToggle}
                        className={`p-1.5 rounded-md hover:bg-[var(--muted)] transition-colors z-20 ${collapsed && !drawer ? 'absolute top-2 left-1/2 -translate-x-1/2' : 'absolute top-2 right-2'}`}
                        style={{ color: 'var(--muted-foreground)' }}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? (
                            <Bars3Icon className="h-4 w-4" />
                        ) : (
                            <XMarkIcon className="h-4 w-4" />
                        )}
                    </button>
                )}
                <img
                    src="/images/hoe logo.png"
                    alt="House Of Electronics"
                    className={`object-contain max-w-full transition-all duration-200 mb-1.5 ${collapsed && !drawer ? 'h-8 w-8' : 'h-12 w-auto'}`}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }}
                />
                <h2 className={`text-[10px] font-medium tracking-wider uppercase transition-all duration-200 ${collapsed && !drawer ? 'opacity-0 h-0 overflow-hidden mb-0' : ''}`} style={{ color: 'var(--muted-foreground)' }}>
                    <span className="font-light opacity-70">House Of</span>{' '}
                    <span
                        className="font-semibold"
                        style={{ color: 'var(--accent)' }}
                    >
                        Electronics
                    </span>
                </h2>
            </div>

            {/* Navigation - Scrollable */}
            <nav className="flex-1 overflow-y-auto space-y-1 px-1">
                {(() => {
                    // If items prop is provided (filtered/modified), rebuild groups to preserve grouping
                    const itemsToUse = items || defaultSidebarItems;

                    // Build map for quick lookup
                    const itemsMap = new Map(itemsToUse.map(item => [item.name, item]));

                    // Rebuild groups with available items
                    const filteredGroups = sidebarGroups
                        .map(group => ({
                            ...group,
                            items: group.items.filter(item => itemsMap.has(item.name))
                        }))
                        .filter(group => group.items.length > 0);

                    // Add Users to System group if present in items
                    const systemGroup = filteredGroups.find(g => g.label === 'System');
                    if (systemGroup && itemsMap.has('Users')) {
                        const usersItem = itemsMap.get('Users')!;
                        const settingsIndex = systemGroup.items.findIndex(item => item.name === 'Settings');
                        if (settingsIndex !== -1) {
                            systemGroup.items.splice(settingsIndex, 0, usersItem);
                        } else {
                            systemGroup.items.push(usersItem);
                        }
                    }

                    // Add Profile as its own group at the end if present
                    if (itemsMap.has('Profile')) {
                        filteredGroups.push({
                            label: null,
                            items: [itemsMap.get('Profile')!],
                        });
                    }

                    // Always use filteredGroups when items prop is provided (permission-filtered)
                    // Otherwise use the default sidebarGroups
                    const groupsToRender = items !== undefined ? filteredGroups : sidebarGroups;

                    return (
                        <>
                            {groupsToRender.map((group, groupIndex) => (
                                <div key={groupIndex} className={groupIndex > 0 ? 'mt-4' : ''}>
                                    {group.label && (
                                        <div className={`px-3 py-1.5 mb-1 transition-opacity duration-200 ${collapsed && !drawer ? 'opacity-0 h-0 overflow-hidden py-0 mb-0' : ''}`}>
                                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                                                {group.label}
                                            </span>
                                        </div>
                                    )}
                                    <div className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const hasSubMenus = item.subMenus && item.subMenus.length > 0;
                                            const isExpanded = expandedItems.has(item.name);
                                            const isActive = active === item.name || (hasSubMenus && isExpanded);

                                            return (
                                                <div key={item.name}>
                                                    <button
                                                        onClick={() => handleItemClick(item)}
                                                        className={`relative w-full flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md text-left transition-all duration-200 hover:bg-[var(--muted)]`}
                                                        style={{
                                                            backgroundColor: isActive ? 'var(--muted)' : 'transparent',
                                                            color: isActive ? 'var(--accent)' : 'var(--foreground)'
                                                        }}
                                                        aria-current={isActive ? "page" : undefined}
                                                    >
                                                        <span
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-r-full transition-all duration-200"
                                                            style={{
                                                                width: isActive ? '2px' : '0px',
                                                                background: 'var(--accent)',
                                                                opacity: isActive ? 1 : 0
                                                            }}
                                                        />
                                                        {hasSubMenus && !collapsed && !drawer && (
                                                            <span className="flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                                                                {isExpanded ? (
                                                                    <ChevronDownIcon className="h-3 w-3" />
                                                                ) : (
                                                                    <ChevronRightIcon className="h-3 w-3" />
                                                                )}
                                                            </span>
                                                        )}
                                                        <item.icon
                                                            className="h-4 w-4 flex-shrink-0 transition-colors duration-200"
                                                            style={{ color: isActive ? 'var(--accent)' : 'var(--muted-foreground)' }}
                                                        />
                                                        <span className={`text-xs transition-all duration-200 truncate ${isActive ? 'font-medium' : 'font-normal'} ${collapsed && !drawer ? 'opacity-0 w-0 overflow-hidden' : ''}`}>
                                                            {item.name}
                                                        </span>
                                                    </button>

                                                    {/* Render sub-menus */}
                                                    {hasSubMenus && isExpanded && item.subMenus && (
                                                        <div className="ml-3 mt-0.5 space-y-0.5">
                                                            {renderSubMenus(item.subMenus)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </>
                    );
                })()}
            </nav>

            {/* Footer */}
            <div className={`flex-shrink-0 border-t pt-2.5 pb-2.5 mt-auto transition-all duration-200 ${collapsed && !drawer ? 'px-2' : 'px-3'}`} style={{ borderColor: 'var(--border)' }}>
                {collapsed && !drawer ? (
                    <div className="text-[8px] text-center" style={{ color: 'var(--muted-foreground)' }}>
                        <div className="font-medium" style={{ color: 'var(--foreground)' }}>v1.0</div>
                    </div>
                ) : (
                    <div className="text-[10px] text-center" style={{ color: 'var(--muted-foreground)' }}>
                        <div className="font-medium mb-0.5" style={{ color: 'var(--foreground)' }}>v1.0.0</div>
                        <div className="opacity-60">© 2025 House Of Electronics</div>
                    </div>
                )}
            </div>
        </aside>
    );
}
