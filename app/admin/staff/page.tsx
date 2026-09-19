'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createStaffAccount, getStaffList, toggleStaffStatus } from '@/app/actions/staff'

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadStaff()
  }, [])

  async function loadStaff() {
    try {
      const data = await getStaffList()
      setStaff(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true)
    setMessage('')
    const formData = new FormData(e.currentTarget)
    try {
      await createStaffAccount(formData)
      setMessage('Staff account created successfully!')
      e.currentTarget.reset()
      await loadStaff()
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await toggleStaffStatus(id, !isActive)
      await loadStaff()
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Staff Management</h2>
        <p className="text-gray-500 text-sm">Create and manage staff accounts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            {message && (
              <div className={`p-3 rounded text-sm ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" placeholder="staff@pharmacy.com" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input name="password" type="password" required />
              </div>
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading staff...</p>
            ) : staff.length === 0 ? (
              <p className="text-sm text-gray-500">No staff accounts found.</p>
            ) : (
              staff.map(s => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                  <div>
                    <p className={`font-medium ${!s.is_active && 'text-gray-500'}`}>{s.email}</p>
                    <p className={`text-sm font-medium ${s.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <Button 
                    variant={s.is_active ? 'destructive' : 'outline'} 
                    size="sm" 
                    className="w-full sm:w-auto"
                    onClick={() => handleToggle(s.id, s.is_active)}
                  >
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
