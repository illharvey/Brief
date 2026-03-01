import { Suspense } from "react"

interface UnsubscribedPageProps {
  searchParams: Promise<{ email?: string }>
}

async function UnsubscribedContent({ searchParams }: UnsubscribedPageProps) {
  const { email } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold text-foreground mb-3">
          You have been unsubscribed
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          {email ? (
            <>
              <strong>{email}</strong> will no longer receive emails from Brief.
            </>
          ) : (
            "Your email address will no longer receive emails from Brief."
          )}
        </p>
        <p className="text-muted-foreground text-sm">
          Changed your mind?{" "}
          <a href="/login" className="text-foreground underline underline-offset-4 hover:no-underline">
            Sign in
          </a>{" "}
          to manage your preferences.
        </p>
      </div>
    </div>
  )
}

export default function UnsubscribedPage(props: UnsubscribedPageProps) {
  return (
    <Suspense fallback={null}>
      <UnsubscribedContent {...props} />
    </Suspense>
  )
}
