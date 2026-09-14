import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function StaffManagement() {
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
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="staff@pharmacy.com" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input type="password" required />
              </div>
            </div>
            <Button type="button">Create Account</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
              <div>
                <p className="font-medium">john.doe@pharmacy.com</p>
                <p className="text-sm text-green-600 font-medium">Active</p>
              </div>
              <Button variant="destructive" size="sm" className="w-full sm:w-auto">Deactivate</Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
              <div>
                <p className="font-medium text-gray-500">jane.smith@pharmacy.com</p>
                <p className="text-sm text-red-600 font-medium">Inactive</p>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">Activate</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
