export default apiHandler(async (event) => {
  await (await adminSession(event)).clear()
  deleteCookie(event, 'dns-console', { path: '/', httpOnly: true, sameSite: 'strict', secure: !import.meta.dev })
  return { success: true }
})
