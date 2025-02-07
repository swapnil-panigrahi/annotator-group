"use server"

import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
})

export async function login(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
      },
    })

    if (!user) {
      return { success: false, error: "Invalid email or password" }
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password" }
    }

    // Don't include password in the cookie
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
    }

    cookies().set("user", JSON.stringify(userWithoutPassword), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return { success: true, user: userWithoutPassword }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "An error occurred during login" }
  }
}

export async function signup(email: string, password: string, name: string) {
  try {
    const validatedData = UserSchema.parse({ email, password, name })

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return { success: false, error: "Email already exists" }
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    cookies().set("user", JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return { success: true, user }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error("Signup error:", error)
    return { success: false, error: "An error occurred during signup" }
  }
}

export async function logout() {
  cookies().delete("user")
  return { success: true }
}

export async function getUser() {
  const userCookie = cookies().get("user")
  if (!userCookie) return null

  try {
    return JSON.parse(userCookie.value)
  } catch {
    return null
  }
}