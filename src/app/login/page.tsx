import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';
import { safeNext } from '@/lib/safe';
import './auth.css';

export const metadata: Metadata = { title: 'Sign in · Gatepass' };

export default async function Login(props: { searchParams: Promise<{ next?: string; mode?: string; expired?: string }> }) {
  const { next, mode, expired } = await props.searchParams;
  return <LoginForm next={safeNext(next)} initialMode={mode === 'signup' ? 'signup' : 'signin'} expired={expired === '1'} />;
}
