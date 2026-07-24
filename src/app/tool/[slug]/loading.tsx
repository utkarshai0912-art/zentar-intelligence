export default function ToolLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back button skeleton */}
      <div className="mb-6 h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />

      {/* Header skeleton */}
      <div className="mb-8 flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      {/* Form skeleton */}
      <div className="mb-8 rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mb-4 h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-36 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Output skeleton */}
      <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
