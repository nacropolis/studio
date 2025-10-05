'use client';

import {
  BrainCircuit,
  Flame,
  HospitalIcon,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

import { UrbanBeeLogo } from '@/components/urban-bee-logo';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  
}
