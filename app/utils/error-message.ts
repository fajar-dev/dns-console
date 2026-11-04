export function getErrorMessage(error: unknown): string {
  const value = error as { data?: { data?: { message?: string }, message?: string, statusMessage?: string }, message?: string }
  return value?.data?.data?.message ?? value?.data?.statusMessage ?? value?.data?.message ?? value?.message ?? 'Something went wrong. Please try again.'
}
