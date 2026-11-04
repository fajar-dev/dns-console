export const signInErrors: Record<string, string> = {
  denied: 'Your Microsoft account has not been assigned access. Contact your administrator.',
  signin: 'Sign-in could not be completed. Please try again.',
  transaction: 'Your sign-in session is missing or expired. Open the app using its configured address and sign in again.',
  credentials: 'Microsoft rejected the application credentials. Check the client secret value and its expiry.',
  redirect: 'The Microsoft redirect URI does not match the application configuration.',
  verification: 'Microsoft token verification failed. Check the server authentication diagnostics.',
  unavailable: 'Microsoft sign-in is temporarily unavailable. Please try again.'
}
