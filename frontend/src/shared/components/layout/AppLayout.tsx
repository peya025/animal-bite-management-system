import React from 'react';
import DashboardLayout from '../../../components/Layout/DashboardLayout';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return <DashboardLayout pageTitle={title}>{children}</DashboardLayout>;
}

export default AppLayout;
