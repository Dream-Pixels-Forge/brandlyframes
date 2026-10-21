import { createFileRoute } from '@tanstack/react-router';
import { DocsLayout } from '@/components/Layout/DocsLayout';

export const Route = createFileRoute('/docs/_layout')({
  component: () => <DocsLayout />,
});