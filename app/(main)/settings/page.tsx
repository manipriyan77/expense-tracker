"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useAuthStore } from "@/store/auth-store";
import {
  Card,
  CardContent,
  CardHeader,
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
  Moon,
  DollarSign,
  Tag,
  Bell,
  Shield,
  Download,
  Upload,
  Trash2,
  Zap,
  Plus,
} from "lucide-react";
import { CsvImportModal } from "@/components/csv-import-modal";
import { useCategorizationRulesStore } from "@/store/categorization-rules-store";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("");
  const [newRuleSubtype, setNewRuleSubtype] = useState("");
  const { rules, fetchRules, addRule, deleteRule } = useCategorizationRulesStore();

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddRule = async () => {
    if (!newRuleKeyword || !newRuleCategory) {
      toast.error("Keyword and category are required");
      return;
    }
    try {
      await addRule({ keyword: newRuleKeyword, category: newRuleCategory, subtype: newRuleSubtype || null, priority: 0 });
      setNewRuleKeyword("");
      setNewRuleCategory("");
      setNewRuleSubtype("");
      toast.success("Rule added");
    } catch {
      toast.error("Failed to add rule");
    }
  };

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    "User";
  const displayEmail = user?.email ?? "";

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Settings</p>
            <p className="text-lg font-semibold text-white">{displayName}</p>
            <p className="text-xs text-slate-500">{displayEmail}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Theme</p>
              <p className="font-mono text-base font-semibold text-slate-200 capitalize">{theme}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Appearance mode</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Currency</p>
              <p className="font-mono text-base font-semibold text-slate-200">{baseCurrency}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Base currency</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Auto-Rules</p>
              <p className="font-mono text-base font-semibold text-slate-200">{rules.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Categorization rules</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="categories">Categories & Tags</TabsTrigger>
            <TabsTrigger value="autorules">Auto-Rules</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Profile Information</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your personal information
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    defaultValue={displayName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    defaultValue={displayEmail}
                    disabled
                  />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Data Management</p>
                <p className="text-xs text-muted-foreground mt-0.5">Export or delete your data</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Export Data</p>
                      <p className="text-sm text-muted-foreground">
                        Download all your data as CSV
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-3">
                    <Upload className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Import Transactions</p>
                      <p className="text-sm text-muted-foreground">
                        Import transactions from a CSV file
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    Import CSV
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-3">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
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
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Theme</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize the appearance of the application
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="pt-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={theme}
                    onValueChange={(value: "light" | "dark" | "system") =>
                      setTheme(value)
                    }
                  >
                    <SelectTrigger id="theme" className="w-full mt-2">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System (follow device)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Current: {resolvedTheme}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Currency Settings */}
          <TabsContent value="currency" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Currency Settings</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage your currency preferences
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="baseCurrency">Base Currency</Label>
                  <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Multi-Currency Support</p>
                    <p className="text-sm text-muted-foreground">
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
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Custom Categories</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add and manage your expense categories
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input placeholder="New category name" />
                  <Button>Add</Button>
                </div>
                <Card className="overflow-hidden p-0">
                  <div className="divide-y divide-border">
                    {[
                      "Food",
                      "Transportation",
                      "Entertainment",
                      "Bills",
                      "Shopping",
                    ].map((category) => (
                      <div
                        key={category}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          <span className="font-medium text-sm">{category}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tags</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create tags to organize your transactions
                </p>
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

          {/* Auto-Categorization Rules */}
          <TabsContent value="autorules" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Auto-Categorization Rules
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Keywords that auto-fill category when adding a transaction
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label>Keyword</Label>
                    <Input
                      placeholder="e.g. Swiggy"
                      value={newRuleKeyword}
                      onChange={(e) => setNewRuleKeyword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Input
                      placeholder="e.g. Food"
                      value={newRuleCategory}
                      onChange={(e) => setNewRuleCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Subtype (optional)</Label>
                    <Input
                      placeholder="e.g. Dining"
                      value={newRuleSubtype}
                      onChange={(e) => setNewRuleSubtype(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleAddRule} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Rule
                </Button>

                {rules.length === 0 ? (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center py-6">
                    No rules yet
                  </p>
                ) : (
                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-border">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Zap className="h-3 w-3 text-yellow-500 shrink-0" />
                            <span className="font-medium text-sm">{rule.keyword}</span>
                            <span className="text-[10px] text-muted-foreground">→</span>
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{rule.category}</span>
                            {rule.subtype && (
                              <span className="text-[10px] text-muted-foreground">· {rule.subtype}</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Notification Preferences</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose how you want to be notified
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
                      Get updates via email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Bill Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Notify before bill due dates
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Budget Alerts</p>
                    <p className="text-sm text-muted-foreground">
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
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Security Settings</p>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your account security</p>
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
                      <p className="text-sm text-muted-foreground">
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

      <CsvImportModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={() => toast.success("Transactions imported!")}
      />
    </div>
  );
}
