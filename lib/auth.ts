import { cookies } from "next/headers"

export async function getUser() {
  const userCookie = cookies().get("user")
  if (!userCookie) return null

  try {
    return JSON.parse(userCookie.value)
  } catch {
    return null
  }
}