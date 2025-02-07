"use server"

import { cookies } from "next/headers"

// Default user for testing
const DEFAULT_USER = {
  email: "test@example.com",
  password: "password123",
  category: "researcher",
}

// In-memory user storage (this is temporary and for demonstration purposes only)
const users = [DEFAULT_USER]

export async function login(email: string, password: string) {
  const user = users.find((u) => u.email === email && u.password === password)
  if (user) {
    cookies().set("user", JSON.stringify({ email: user.email, category: user.category }), {
      httpOnly: true,
      secure: true,
    })
    return { success: true, user: { email: user.email, category: user.category } }
  }
  return { success: false, error: "Invalid email or password" }
}

export async function signup(email: string, password: string, category: string) {
  if (users.some((u) => u.email === email)) {
    return { success: false, error: "Email already exists" }
  }
  const newUser = { email, password, category }
  users.push(newUser)
  cookies().set("user", JSON.stringify({ email: newUser.email, category: newUser.category }), {
    httpOnly: true,
    secure: true,
  })
  return { success: true, user: { email: newUser.email, category: newUser.category } }
}

export async function logout() {
  cookies().delete("user")
  return { success: true }
}

export async function getUser() {
  const userCookie = cookies().get("user")
  return userCookie ? JSON.parse(userCookie.value) : null
}

