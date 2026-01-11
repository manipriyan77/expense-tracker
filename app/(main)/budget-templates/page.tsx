"use client";

import { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Copy,
  Globe,
  Lock,
  FileText,
  Edit,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import { useBudgetTemplatesStore, type BudgetTemplate, calculateTotalBudget } from "@/store/budget-templates-store";

// System templates (read-only)
const SYSTEM_TEMPLATES = [
    {
      id: "system-1",
      name: "Student Budget",
      description: "Budget template for college students",
      is_public: true,
      total_budget: 2000,
      categories: [
        { category: "Food", subtype: "Groceries", amount: 300, period: "monthly" },
        { category: "Food", subtype: "Dining Out", amount: 150, period: "monthly" },
        { category: "Transportation", subtype: "Public Transit", amount: 100, period: "monthly" },
        { category: "Housing", subtype: "Rent", amount: 800, period: "monthly" },
        { category: "Utilities", subtype: "Internet", amount: 50, period: "monthly" },
        { category: "Entertainment", subtype: "Subscriptions", amount: 50, period: "monthly" },
        { category: "Personal", subtype: "Clothing", amount: 100, period: "monthly" },
        { category: "Education", subtype: "Books", amount: 150, period: "monthly" },
        { category: "Healthcare", subtype: "Insurance", amount: 200, period: "monthly" },
        { category: "Savings", subtype: "Emergency Fund", amount: 100, period: "monthly" },
      ],
    },
    {
      id: "system-2",
      name: "Family Budget",
      description: "Comprehensive budget for families with children",
      is_public: true,
      total_budget: 6500,
      categories: [
        { category: "Housing", subtype: "Mortgage", amount: 2000, period: "monthly" },
        { category: "Housing", subtype: "Property Tax", amount: 300, period: "monthly" },
        { category: "Utilities", subtype: "Electric & Gas", amount: 200, period: "monthly" },
        { category: "Food", subtype: "Groceries", amount: 800, period: "monthly" },
        { category: "Transportation", subtype: "Car Payment", amount: 500, period: "monthly" },
        { category: "Transportation", subtype: "Gas", amount: 300, period: "monthly" },
        { category: "Insurance", subtype: "Health", amount: 600, period: "monthly" },
        { category: "Insurance", subtype: "Auto", amount: 200, period: "monthly" },
        { category: "Children", subtype: "Childcare", amount: 1000, period: "monthly" },
        { category: "Entertainment", subtype: "Family Activities", amount: 300, period: "monthly" },
        { category: "Savings", subtype: "College Fund", amount: 300, period: "monthly" },
      ],
    },
    {
      id: "system-3",
      name: "Freelancer Budget",
      description: "Budget for self-employed professionals",
      is_public: true,
      total_budget: 4000,
      categories: [
        { category: "Housing", subtype: "Rent", amount: 1500, period: "monthly" },
        { category: "Business", subtype: "Software", amount: 200, period: "monthly" },
        { category: "Business", subtype: "Marketing", amount: 300, period: "monthly" },
        { category: "Food", subtype: "Groceries", amount: 400, period: "monthly" },
        { category: "Transportation", subtype: "Car", amount: 250, period: "monthly" },
        { category: "Healthcare", subtype: "Insurance", amount: 500, period: "monthly" },
        { category: "Taxes", subtype: "Quarterly Estimated", amount: 600, period: "monthly" },
        { category: "Savings", subtype: "Retirement", amount: 250, period: "monthly" },
      ],
    },
  ] as const;

// Default categories for budget templates
const DEFAULT_CATEGORIES = [
  "Food",
  "Transportation",
  "Housing",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Insurance",
  "Education",
  "Personal",
  "Savings",
  "Shopping",
  "Bills",
  "Business",
  "Taxes",
  "Children",
  "Gifts",
  "Travel",
  "Other",
];

const DEFAULT_PERIODS = ["weekly", "monthly", "yearly"];

export default function BudgetTemplatesPage() {
  const { templates: userTemplates, loading, fetchTemplates, addTemplate, updateTemplate, deleteTemplate } = useBudgetTemplatesStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const [selectedSystemTemplate, setSelectedSystemTemplate] = useState<typeof SYSTEM_TEMPLATES[number] | null>(null);
  const [createMode, setCreateMode] = useState<"from-budgets" | "manual">("manual"); // Default to manual mode

  // Form state
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    categories: [] as Array<{ category: string; subtype: string; amount: number; period: string }>,
    is_public: false,
  });

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCurrentBudgets = async () => {
    try {
      const response = await fetch("/api/budgets");
      if (!response.ok) throw new Error("Failed to fetch budgets");
      
      const budgets = await response.json();
      
      if (budgets.length === 0) {
        toast.error("No budgets found. Create some budgets first!");
        return;
      }

      // Convert budgets to template format
      const categories = budgets.map((budget: any) => ({
        category: budget.category,
        subtype: budget.subtype || "",
        amount: parseFloat(budget.limit_amount),
        period: budget.period || "monthly",
      }));

      setTemplateForm({
        ...templateForm,
        categories,
      });
      
      setCreateMode("from-budgets");
      toast.success(`Loaded ${categories.length} budget categories!`);
    } catch (error) {
      console.error("Error loading budgets:", error);
      toast.error("Failed to load current budgets");
    }
  };

  const addCategoryRow = () => {
    setTemplateForm({
      ...templateForm,
      categories: [
        ...templateForm.categories,
        { category: "", subtype: "", amount: 0, period: "monthly" },
      ],
    });
  };

  const removeCategoryRow = (index: number) => {
    const newCategories = templateForm.categories.filter((_, i) => i !== index);
    setTemplateForm({ ...templateForm, categories: newCategories });
  };

  const updateCategoryRow = (index: number, field: string, value: any) => {
    const newCategories = [...templateForm.categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setTemplateForm({ ...templateForm, categories: newCategories });
  };

  const resetCreateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      categories: [],
      is_public: false,
    });
    setCreateMode("manual");
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateForm.name || !templateForm.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (templateForm.categories.length === 0) {
      toast.error("Please add at least one category to your template");
      return;
    }

    // Validate that all categories have required fields
    const invalidCategories = templateForm.categories.filter(
      (cat) => !cat.category || cat.amount <= 0
    );
    
    if (invalidCategories.length > 0) {
      toast.error("Please fill in all category fields with valid amounts");
      return;
    }
    
    try {
      console.log("Creating template:", templateForm);
      await addTemplate({
        name: templateForm.name,
        description: templateForm.description,
        categories: templateForm.categories,
        is_public: templateForm.is_public,
      });
      toast.success("Template created successfully!");
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error("Error creating template:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Show error with longer duration if it contains setup instructions
      const isSetupError = errorMessage.includes("does not exist") || errorMessage.includes("migration");
      
      toast.error(`Failed to create template: ${errorMessage}`, {
        duration: isSetupError ? 10000 : 4000, // 10 seconds for setup errors, 4 seconds for others
      });
    }
  };

  const handleEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    try {
      await updateTemplate(selectedTemplate.id, {
        name: templateForm.name,
        description: templateForm.description,
        categories: templateForm.categories,
        is_public: templateForm.is_public,
      });
      toast.success("Template updated successfully!");
      setIsEditOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      toast.error("Failed to update template");
    }
  };

  const handleDeleteTemplate = async (template: BudgetTemplate) => {
    if (confirm(`Are you sure you want to delete ${template.name}?`)) {
      try {
        await deleteTemplate(template.id);
        toast.success("Template deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete template");
      }
    }
  };

  const openEditDialog = (template: BudgetTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      categories: template.categories,
      is_public: template.is_public,
    });
    setIsEditOpen(true);
  };

  const applyTemplate = async (template: any) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      console.log("Applying template:", template.name, "with", template.categories.length, "categories");

      // Create budgets for each category in the template
      const budgetPromises = template.categories.map(async (cat: any) => {
        const response = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat.category,
            subtype: cat.subtype || null,
            limit_amount: cat.amount,
            period: cat.period || "monthly",
            month: currentMonth,
            year: currentYear,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to create budget:", cat.category, error);
          throw new Error(`Failed to create budget for ${cat.category}: ${error.error || 'Unknown error'}`);
        }
        
        return response.json();
      });

      const results = await Promise.all(budgetPromises);
      console.log("Created budgets:", results);
      toast.success(`Applied ${template.name}! Created ${template.categories.length} budgets for ${currentMonth}/${currentYear}.`);
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error(`Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportTemplate = (template: any) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `${template.name.replace(/\s+/g, "_")}_template.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Budget Templates</h1>
              <p className="text-sm text-gray-500 mt-1">
                Start with pre-built templates or create your own
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) resetCreateForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Budget Template</DialogTitle>
                    <DialogDescription>
                      Create a reusable budget template from scratch or load from existing budgets
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTemplate} className="space-y-6 py-4">
                    {/* Template Info */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Template Name <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="e.g., My Monthly Budget" 
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="Brief description of this template" 
                          value={templateForm.description}
                          onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Load Source Options */}
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-base font-semibold">Budget Categories</Label>
                      <p className="text-xs text-gray-500">Add categories manually or import from existing budgets</p>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={createMode === "from-budgets" ? "default" : "outline"}
                          className="flex-1" 
                          onClick={loadCurrentBudgets}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Load From Current Budgets
                        </Button>
                        <Button 
                          type="button" 
                          variant={createMode === "manual" ? "default" : "outline"}
                          className="flex-1" 
                          onClick={() => {
                            setCreateMode("manual");
                            if (templateForm.categories.length === 0) {
                              addCategoryRow();
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Build Manually
                        </Button>
                      </div>
                    </div>

                    {/* Manual Category Builder */}
                    {createMode === "manual" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Categories</Label>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            onClick={addCategoryRow}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Category
                          </Button>
                        </div>

                        {templateForm.categories.length === 0 ? (
                          <div className="p-6 border-2 border-dashed rounded-lg text-center">
                            <p className="text-sm text-gray-500 mb-3">No categories added yet</p>
                            <Button 
                              type="button" 
                              size="sm" 
                              onClick={addCategoryRow}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Your First Category
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {templateForm.categories.map((cat, index) => (
                              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 grid grid-cols-2 gap-3">
                                    {/* Category */}
                                    <div className="space-y-1">
                                      <Label className="text-xs">Category *</Label>
                                      <select
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                        value={cat.category}
                                        onChange={(e) => updateCategoryRow(index, "category", e.target.value)}
                                        required
                                      >
                                        <option value="">Select category</option>
                                        {DEFAULT_CATEGORIES.map((c) => (
                                          <option key={c} value={c}>{c}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Subtype */}
                                    <div className="space-y-1">
                                      <Label className="text-xs">Subtype</Label>
                                      <Input
                                        placeholder="e.g., Groceries"
                                        value={cat.subtype}
                                        onChange={(e) => updateCategoryRow(index, "subtype", e.target.value)}
                                        className="text-sm"
                                      />
                                    </div>

                                    {/* Amount */}
                                    <div className="space-y-1">
                                      <Label className="text-xs">Amount * ($)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={cat.amount || ""}
                                        onChange={(e) => updateCategoryRow(index, "amount", parseFloat(e.target.value) || 0)}
                                        className="text-sm"
                                        required
                                      />
                                    </div>

                                    {/* Period */}
                                    <div className="space-y-1">
                                      <Label className="text-xs">Period</Label>
                                      <select
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                        value={cat.period}
                                        onChange={(e) => updateCategoryRow(index, "period", e.target.value)}
                                      >
                                        {DEFAULT_PERIODS.map((p) => (
                                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Remove Button */}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => removeCategoryRow(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Total Summary */}
                        {templateForm.categories.length > 0 && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium text-blue-900">Total Budget</p>
                                <p className="text-xs text-blue-700">{templateForm.categories.length} categories</p>
                              </div>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(calculateTotalBudget(templateForm.categories))}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* From Budgets Mode Summary */}
                    {createMode === "from-budgets" && templateForm.categories.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Loaded {templateForm.categories.length} categories with total budget of {formatCurrency(calculateTotalBudget(templateForm.categories))}
                        </p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || !templateForm.name || !templateForm.description || templateForm.categories.length === 0}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Template
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="public" className="space-y-6">
          <TabsList>
            <TabsTrigger value="public">
              <Globe className="h-4 w-4 mr-2" />
              Public Templates
            </TabsTrigger>
            <TabsTrigger value="my">
              <Lock className="h-4 w-4 mr-2" />
              My Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {SYSTEM_TEMPLATES.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          <Globe className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Budget</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(calculateTotalBudget(template.categories))}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.categories.length} categories
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">
                          Top Categories:
                        </p>
                        {template.categories.slice(0, 3).map((cat, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm text-gray-600"
                          >
                            <span className="truncate">{cat.category}</span>
                            <span className="font-medium">
                              {formatCurrency(cat.amount)}
                            </span>
                          </div>
                        ))}
                        {template.categories.length > 3 && (
                          <p className="text-xs text-gray-400">
                            +{template.categories.length - 3} more categories
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1"
                          onClick={() => applyTemplate(template)}
                        >
                          Apply Template
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedSystemTemplate(template)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => exportTemplate(template)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="my">
            {userTemplates.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No custom templates yet"
                description="Create your first budget template from your current budgets or start from scratch"
                actionLabel="Create Template"
                onAction={() => setIsCreateOpen(true)}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTemplate(template)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Budget</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(calculateTotalBudget(template.categories))}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.categories.length} categories
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">
                          Top Categories:
                        </p>
                        {template.categories.slice(0, 3).map((cat, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm text-gray-600"
                          >
                            <span className="truncate">{cat.category}</span>
                            <span className="font-medium">
                              {formatCurrency(cat.amount)}
                            </span>
                          </div>
                        ))}
                        {template.categories.length > 3 && (
                          <p className="text-xs text-gray-400">
                            +{template.categories.length - 3} more categories
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1"
                          onClick={() => applyTemplate(template)}
                        >
                          Apply Template
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => exportTemplate(template)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* User Template Details Dialog */}
        {selectedTemplate && (
          <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedTemplate.name}</DialogTitle>
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Monthly Budget</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(calculateTotalBudget(selectedTemplate.categories))}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {selectedTemplate.categories.length} categories
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Budget Breakdown:</h4>
                  {selectedTemplate.categories.map((cat, idx) => {
                    const totalBudget = calculateTotalBudget(selectedTemplate.categories);
                    const percentage = (cat.amount / totalBudget) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>
                            {cat.category}
                            {cat.subtype && ` - ${cat.subtype}`}
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(cat.amount)}{" "}
                            <span className="text-gray-500">
                              ({percentage.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    applyTemplate(selectedTemplate);
                    setSelectedTemplate(null);
                  }}
                >
                  Apply This Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* System Template Details Dialog */}
        {selectedSystemTemplate && (
          <Dialog open={!!selectedSystemTemplate} onOpenChange={() => setSelectedSystemTemplate(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedSystemTemplate.name}</DialogTitle>
                <DialogDescription>{selectedSystemTemplate.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Monthly Budget</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(selectedSystemTemplate.total_budget)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {selectedSystemTemplate.categories.length} categories
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Budget Breakdown:</h4>
                  {selectedSystemTemplate.categories.map((cat, idx) => {
                    const totalBudget = calculateTotalBudget(selectedSystemTemplate.categories);
                    const percentage = (cat.amount / totalBudget) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>
                            {cat.category}
                            {cat.subtype && ` - ${cat.subtype}`}
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(cat.amount)}{" "}
                            <span className="text-gray-500">
                              ({percentage.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    applyTemplate(selectedSystemTemplate);
                    setSelectedSystemTemplate(null);
                  }}
                >
                  Apply This Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>

      {/* Edit Template Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update template information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTemplate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input 
                placeholder="e.g., My Monthly Budget" 
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Brief description of this template" 
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                required
              />
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-sm text-gray-500 mt-1">
                {templateForm.categories.length} categories with total budget of {formatCurrency(calculateTotalBudget(templateForm.categories))}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Note: Category editing not yet implemented. To modify categories, create a new template.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Template
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
