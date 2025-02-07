import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const userCookie = cookies().get("user")
    if (!userCookie) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    )
  }
}