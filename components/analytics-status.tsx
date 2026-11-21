import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react';

export default function AnalyticsStatus({ state, children }: {
  state: 'loading' | 'error' | 'empty';
  children: string;
}) {
  const Icon = state === 'loading' ? LoaderCircle : state === 'error' ? CircleAlert : Inbox;
  return <p role={state === 'error' ? 'alert' : 'status'}
    className={state === 'error' ? 'error flex items-center gap-2' : 'analytics-hint flex items-center gap-2'}>
    <Icon size={18} aria-hidden="true" className={state === 'loading' ? 'shrink-0 motion-safe:animate-spin' : 'shrink-0'} />
    {children}
  </p>;
}
