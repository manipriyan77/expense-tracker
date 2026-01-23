"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings as SettingsIcon,
  Moon,
  DollarSign,
  Tag,
  Bell,
  Shield,
  Download,
  Trash2,
} from "lucide-react";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("INR");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="categories">Categories & Tags</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    defaultValue="User"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    defaultValue="user@example.com"
                    disabled
                  />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Export or delete your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Export Data</p>
                      <p className="text-sm text-gray-500">
                        Download all your data as CSV
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-3">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-gray-500">
                        Permanently delete your account
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="text-red-600">
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Moon className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-gray-500">Enable dark theme</p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <div className="pt-4 border-t">
                  <Label htmlFor="theme">Theme Preference</Label>
                  <Select defaultValue="system">
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Currency Settings */}
          <TabsContent value="currency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Currency Settings</CardTitle>
                <CardDescription>
                  Manage your currency preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="baseCurrency">Base Currency</Label>
                  <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="AUD">
                        AUD - Australian Dollar
                      </SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Multi-Currency Support</p>
                    <p className="text-sm text-gray-500">
                      Track transactions in multiple currencies
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button>Save Currency Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories & Tags */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Custom Categories</CardTitle>
                <CardDescription>
                  Add and manage your expense categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input placeholder="New category name" />
                  <Button>Add</Button>
                </div>
                <div className="space-y-2">
                  {[
                    "Food",
                    "Transportation",
                    "Entertainment",
                    "Bills",
                    "Shopping",
                  ].map((category) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                        <span>{category}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Create tags to organize your transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input placeholder="New tag name" />
                  <Button>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Personal", "Work", "Family", "Vacation", "Emergency"].map(
                    (tag) => (
                      <div
                        key={tag}
                        className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
                      >
                        <Tag className="h-3 w-3" />
                        <span className="text-sm">{tag}</span>
                        <button className="text-blue-900 hover:text-blue-950">
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-gray-500">
                        Receive notifications in your browser
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">
                      Get updates via email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Bill Reminders</p>
                    <p className="text-sm text-gray-500">
                      Notify before bill due dates
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Budget Alerts</p>
                    <p className="text-sm text-gray-500">
                      Alert when approaching budget limits
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                  <Input type="password" placeholder="Confirm new password" />
                  <Button>Update Password</Button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">
                        Add an extra layer of security
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
