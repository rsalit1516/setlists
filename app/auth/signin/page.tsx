import { signIn } from '@/auth'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Use your Microsoft account to access Setlists.
        </p>
        <form
          action={async () => {
            'use server'
            await signIn('microsoft-entra-id', { redirectTo: '/setlists' })
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  )
}
