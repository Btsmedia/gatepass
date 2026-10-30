import LoginForm from '@/components/LoginForm';
import { safeNext } from '@/lib/safe';

export default async function Login(props: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await props.searchParams;
  return (
    <div className="panel" style={{ maxWidth: 460, margin: '40px auto', display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 30 }}>Sign in</h1>
      <LoginForm next={safeNext(next)} />
    </div>
  );
}
