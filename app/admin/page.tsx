"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from '@supabase/ssr'
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: true, autoRefreshToken: true }
    }
  )
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsAdmin(false)
        setError("Not authenticated.")
        return
      }
      const { data: settings, error: settingsError } = await supabase
        .from('Settings')
        .select('isAdmin')
        .eq('userId', user.id)
        .single()
      if (settingsError) {
        setIsAdmin(false)
        setError("Unable to check admin status.")
        return
      }
      if (settings?.isAdmin) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        setError("You do not have permission to access this page.")
      }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, Settings(summaryWindowDays)')
          .order('name', { ascending: true })
        if (error) setError(error.message)
        setUsers(data ?? [])
        setLoading(false)
      }
      fetchUsers()
    }
  }, [isAdmin])

  const handleChange = async (userId: string, newValue: number) => {
    setUpdating(userId)
    console.log('Attempting to update summaryWindowDays for user', userId, 'to', newValue)
    const { error } = await supabase
      .from('Settings')
      .update({ summaryWindowDays: newValue })
      .eq('userId', userId)
    if (error) {
      console.log('Settings update error:', error)
      alert('Failed to update: ' + error.message)
    } else {
      console.log('Settings update success for user', userId)
      alert('Updated summary window days!')
    }
    setUpdating(null)
    // Refresh users
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, Settings(summaryWindowDays)') // always lowercase
      .order('name', { ascending: true })
    setUsers(data ?? [])
  }

  if (isAdmin === false) {
    return <div className="max-w-2xl mx-auto py-8 text-red-600 font-bold">{error || "You do not have permission to access this page."}</div>
  }
  if (isAdmin === null) {
    return <div className="max-w-2xl mx-auto py-8">Checking admin status...</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      {loading ? <div>Loading users...</div> : error ? <div className="text-red-500">{error}</div> : (
        Array.isArray(users) && users.length > 0 ? (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Summary Window Days</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {
                users.map((u: any) => {
                  console.log('u.Settings:', u.Settings); // <-- Add this line
                  return (
                    <tr key={u.id}>
                      <td className="p-2 border">{u.name}</td>
                      <td className="p-2 border">{u.email}</td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          defaultValue={u.Settings[0]?.summaryWindowDays ?? 7}
                          disabled={updating === u.id}
                          className="border rounded px-2 py-1 w-24"
                          id={`window-${u.id}`}
                        />
                      </td>
                      <td className="p-2 border">
                        <Button
                          size="sm"
                          disabled={updating === u.id}
                          onClick={() => {
                            const val = (document.getElementById(`window-${u.id}`) as HTMLInputElement)?.value
                            handleChange(u.id, Number(val))
                          }}
                        >
                          {updating === u.id ? 'Saving...' : 'Save'}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        ) : (
          <div>No users found.</div>
        )
      )}
    </div>
  )
}
