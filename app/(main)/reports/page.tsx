"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState("monthly");

  const checkAuth = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (!session) {
        router.push("/sign-in");
        return;
      }

      const { data: userData } = await supabase().auth.getUser();
      if (userData.user) {
        setUser(userData.user);
      } else {
        setUser(session.user);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/sign-in");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Reports & Export
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Report Period</CardTitle>
            <CardDescription>Select the time period for your reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="quarterly">This Quarter</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Custom Date Range
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="export" className="space-y-4">
          <TabsList>
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="reports">Generate Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          </TabsList>

          {/* Export Data */}
          <TabsContent value="export" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5 text-blue-600" />
                    <span>Export to CSV</span>
                  </CardTitle>
                  <CardDescription>
                    Download your transactions as a CSV file
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Includes:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      <li>All transactions</li>
                      <li>Categories and tags</li>
                      <li>Date and amount</li>
                    </ul>
                  </div>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    <span>Export to PDF</span>
                  </CardTitle>
                  <CardDescription>
                    Generate a professional PDF report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Includes:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      <li>Summary statistics</li>
                      <li>Charts and graphs</li>
                      <li>Transaction details</li>
                    </ul>
                  </div>
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    <span>Export to Excel</span>
                  </CardTitle>
                  <CardDescription>
                    Download with formulas and formatting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Includes:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      <li>Multiple sheets</li>
                      <li>Formulas and calculations</li>
                      <li>Pivot tables</li>
                    </ul>
                  </div>
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span>Tax Report</span>
                  </CardTitle>
                  <CardDescription>
                    Export tax-deductible expenses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Includes:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      <li>Deductible expenses</li>
                      <li>Category breakdown</li>
                      <li>Tax year summary</li>
                    </ul>
                  </div>
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export Tax Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Generate Reports */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Monthly Summary",
                  description: "Overview of income and expenses",
                  icon: Calendar,
                },
                {
                  title: "Category Analysis",
                  description: "Spending breakdown by category",
                  icon: PieChartIcon,
                },
                {
                  title: "Trend Analysis",
                  description: "6-month financial trends",
                  icon: TrendingUp,
                },
                {
                  title: "Budget Performance",
                  description: "Compare budget vs actual spending",
                  icon: BarChart3,
                },
                {
                  title: "Cash Flow Report",
                  description: "Money in and money out",
                  icon: Download,
                },
                {
                  title: "Year-End Report",
                  description: "Annual financial summary",
                  icon: FileText,
                },
              ].map((report) => (
                <Card key={report.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <report.icon className="h-8 w-8 text-blue-600 mb-4" />
                    <h3 className="font-semibold mb-2">{report.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {report.description}
                    </p>
                    <Button variant="outline" className="w-full">
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Scheduled Reports */}
          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
                <CardDescription>
                  Automatically generate and email reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full md:w-auto">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule New Report
                </Button>
                <div className="space-y-4 mt-6">
                  {[
                    {
                      name: "Weekly Summary",
                      frequency: "Every Monday at 9:00 AM",
                      format: "PDF",
                      active: true,
                    },
                    {
                      name: "Monthly Report",
                      frequency: "1st of every month",
                      format: "Excel",
                      active: true,
                    },
                    {
                      name: "Quarterly Analysis",
                      frequency: "End of quarter",
                      format: "PDF + CSV",
                      active: false,
                    },
                  ].map((schedule) => (
                    <div
                      key={schedule.name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{schedule.name}</p>
                        <p className="text-sm text-gray-600">{schedule.frequency}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Format: {schedule.format}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            schedule.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {schedule.active ? "Active" : "Paused"}
                        </span>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
