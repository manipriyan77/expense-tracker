# Custom Budget Templates - User Guide

## ✨ New Feature: Manual Budget Template Builder

You can now create custom budget templates from scratch without needing existing budgets!

## How to Create a Custom Budget Template

### Step 1: Open Budget Templates Page
Navigate to **Budget Templates** from the sidebar.

### Step 2: Click "Create Template"
Click the **"Create Template"** button in the top right.

### Step 3: Fill in Template Information
- **Template Name**: Give your template a descriptive name (e.g., "My Monthly Budget")
- **Description**: Add a brief description (e.g., "Personal monthly budget for 2026")

### Step 4: Choose Your Creation Mode

You have **2 options**:

#### Option 1: Build Manually (New!)
1. Click **"Build Manually"** button
2. Click **"Add Category"** or **"Add Your First Category"**
3. For each category, fill in:
   - **Category**: Select from dropdown (Food, Transportation, Housing, etc.)
   - **Subtype**: Optional (e.g., "Groceries", "Gas", "Rent")
   - **Amount**: Enter the budget amount in dollars
   - **Period**: Choose weekly, monthly, or yearly
4. Click the **"+ Add Category"** button to add more categories
5. Click the **trash icon** to remove categories you don't want
6. See your **Total Budget** update automatically at the bottom

#### Option 2: Load From Current Budgets
1. Click **"Load From Current Budgets"** button
2. This imports all your existing budget categories
3. The template is pre-filled with your current budgets

### Step 5: Create Template
Click the **"Create Template"** button at the bottom to save your template.

## Features

### ✅ What You Can Do

- **Add Multiple Categories**: Build templates with as many categories as you need
- **18 Pre-defined Categories**: Choose from:
  - Food, Transportation, Housing, Utilities
  - Entertainment, Healthcare, Insurance, Education
  - Personal, Savings, Shopping, Bills
  - Business, Taxes, Children, Gifts, Travel, Other
- **Custom Subtypes**: Add specific subtypes for each category
- **Flexible Periods**: Set budgets as weekly, monthly, or yearly
- **Real-time Total**: See your total budget amount update as you add categories
- **Easy Editing**: Remove or modify categories before creating
- **Load from Existing**: Import your current budgets as a starting point

### 📋 Example Custom Template

**Template Name**: "Young Professional Budget"

| Category | Subtype | Amount | Period |
|----------|---------|--------|--------|
| Housing | Rent | $1,500 | Monthly |
| Food | Groceries | $400 | Monthly |
| Food | Dining Out | $200 | Monthly |
| Transportation | Car Payment | $350 | Monthly |
| Transportation | Gas | $150 | Monthly |
| Utilities | Electric & Internet | $150 | Monthly |
| Entertainment | Subscriptions | $50 | Monthly |
| Healthcare | Insurance | $300 | Monthly |
| Savings | Emergency Fund | $500 | Monthly |
| Personal | Clothing | $100 | Monthly |

**Total: $3,700/month**

## Tips

1. **Start Small**: Begin with essential categories and add more later
2. **Use Subtypes**: They help you track spending more precisely
3. **Be Realistic**: Set amounts you can actually stick to
4. **Review Regularly**: Update your templates as your needs change
5. **Try System Templates**: Check out the pre-built templates for inspiration

## Applying Templates

Once created, you can:
- **Apply** the template to create actual budgets for the current month
- **Edit** the template name and description
- **Delete** templates you no longer need
- **Export** templates as JSON files
- **View Details** to see the complete breakdown

## Need Help?

If you encounter any issues:
1. Make sure you've run the database migration (see `QUICK_FIX_BUDGET_TEMPLATES.md`)
2. Check that all required fields are filled in
3. Verify amounts are positive numbers
4. Each category must have a category name and amount

---

**Enjoy creating your custom budget templates! 🎉**
