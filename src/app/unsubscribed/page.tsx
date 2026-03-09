export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          You have been unsubscribed
        </h1>
        {email && (
          <p className="text-gray-600">
            <strong>{decodeURIComponent(email)}</strong> will no longer receive
            Brief emails.
          </p>
        )}
        <p className="text-gray-500 text-sm">
          If this was a mistake, you can re-subscribe from your account settings.
        </p>
        <a
          href="/"
          className="inline-block text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Return to Brief
        </a>
      </div>
    </main>
  )
}
