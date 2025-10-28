import { Skeleton } from '@/components/ui/skeleton';

interface MarketTableSkeletonProps {
  rows?: number;
}

export function MarketTableSkeleton({ rows = 10 }: MarketTableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4">
                  <Skeleton className="h-4 w-8" />
                </th>
                <th className="text-left py-3 px-4">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="text-right py-3 px-4">
                  <Skeleton className="h-4 w-12" />
                </th>
                <th className="text-right py-3 px-4">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="text-right py-3 px-4">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="text-right py-3 px-4">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="text-center py-3 px-4">
                  <Skeleton className="h-4 w-16" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-6" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Skeleton className="h-8 w-20 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-18" />
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}