import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 hidden md:flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
      </header>
      
      {/* Account Overview Skeleton */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <Skeleton className="h-8 w-1/3 mb-4" />
        </div>
        <div className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Payment Schedule Table Skeleton */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm mt-6">
        <div className="p-6">
          <Skeleton className="h-8 w-1/2 mb-4" />
        </div>
        <div className="overflow-x-auto p-6">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-1/6" />
                <Skeleton className="h-10 w-1/6" />
                <Skeleton className="h-10 w-1/6" />
                <Skeleton className="h-10 w-1/6" />
                <Skeleton className="h-10 w-1/6" />
                <Skeleton className="h-10 w-1/6" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Balance Summary Skeleton */}
       <div className="rounded-lg border bg-card text-card-foreground shadow-sm mt-6">
        <div className="p-6">
          <Skeleton className="h-8 w-1/3 mb-4" />
        </div>
        <div className="p-6 pt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div>
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="p-4 border rounded-md">
            <Skeleton className="h-6 w-1/4 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        </div>
      </div>
      
      {/* Footer Skeleton */}
      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <Skeleton className="h-4 w-2/3 md:w-1/3" />
        </div>
      </footer>
    </div>
  );
}
