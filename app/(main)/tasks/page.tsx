"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Plus,
  Trash2,
  Calendar,
  Flag,
  ChevronRight,
  ChevronDown,
  Sun,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  Circle,
  Edit3,
  X,
  Inbox,
  AlignLeft,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskList {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  priority: "high" | "medium" | "low" | "none";
  status: "pending" | "completed" | "archived";
  list_id: string | null;
  order_index: number;
  completed_at: string | null;
  created_at: string;
}

type View = "today" | "upcoming" | "all" | "completed" | string; // string = list id

// ─── Constants ────────────────────────────────────────────────────────────────

const LIST_COLORS: { value: string; label: string; cls: string; dot: string }[] = [
  { value: "red",    label: "Red",    cls: "text-red-500",    dot: "bg-red-500" },
  { value: "orange", label: "Orange", cls: "text-orange-500", dot: "bg-orange-500" },
  { value: "yellow", label: "Yellow", cls: "text-yellow-500", dot: "bg-yellow-500" },
  { value: "green",  label: "Green",  cls: "text-green-500",  dot: "bg-green-500" },
  { value: "blue",   label: "Blue",   cls: "text-blue-500",   dot: "bg-blue-500" },
  { value: "violet", label: "Violet", cls: "text-violet-500", dot: "bg-violet-500" },
  { value: "pink",   label: "Pink",   cls: "text-pink-500",   dot: "bg-pink-500" },
  { value: "gray",   label: "Gray",   cls: "text-gray-500",   dot: "bg-gray-500" },
];

const PRIORITY_META = {
  high:   { label: "High",   cls: "text-red-500",    border: "border-red-500",    bg: "bg-red-500/10" },
  medium: { label: "Medium", cls: "text-orange-500", border: "border-orange-500", bg: "bg-orange-500/10" },
  low:    { label: "Low",    cls: "text-blue-500",   border: "border-blue-500",   bg: "bg-blue-500/10" },
  none:   { label: "None",   cls: "text-muted-foreground", border: "border-muted-foreground/40", bg: "" },
};

function getColorDot(color: string) {
  return LIST_COLORS.find((c) => c.value === color)?.dot ?? "bg-blue-500";
}
function getColorCls(color: string) {
  return LIST_COLORS.find((c) => c.value === color)?.cls ?? "text-blue-500";
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dueBadge(dueDate: string | null): { label: string; cls: string } | null {
  if (!dueDate) return null;
  const today = toISODate(new Date());
  const tomorrow = toISODate(new Date(Date.now() + 86400000));
  if (dueDate < today) return { label: "Overdue", cls: "text-red-500 bg-red-500/10" };
  if (dueDate === today) return { label: "Today", cls: "text-orange-500 bg-orange-500/10" };
  if (dueDate === tomorrow) return { label: "Tomorrow", cls: "text-yellow-600 bg-yellow-500/10" };
  return { label: new Date(dueDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }), cls: "text-muted-foreground bg-muted/60" };
}

// ─── Smart views ──────────────────────────────────────────────────────────────

const SMART_VIEWS = [
  { id: "today",     label: "Today",     icon: Sun,         color: "text-orange-500" },
  { id: "upcoming",  label: "Upcoming",  icon: CalendarDays, color: "text-blue-500" },
  { id: "all",       label: "All Tasks", icon: ListTodo,    color: "text-foreground" },
  { id: "completed", label: "Completed", icon: CheckCircle2, color: "text-green-500" },
];

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  lists,
  onToggle,
  onDelete,
  onUpdate,
}: {
  task: Task;
  lists: TaskList[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [saving, setSaving] = useState(false);
  const done = task.status === "completed";
  const badge = dueBadge(task.due_date);
  const pm = PRIORITY_META[task.priority];
  const list = lists.find((l) => l.id === task.list_id);

  async function saveEdits() {
    setSaving(true);
    await onUpdate(task.id, { title: editTitle, description: editDesc });
    setSaving(false);
    setExpanded(false);
  }

  return (
    <div className={cn("group border-b last:border-b-0 transition-colors", done ? "opacity-50" : "hover:bg-muted/20")}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Complete toggle */}
        <button
          onClick={() => onToggle(task)}
          className={cn(
            "mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
            done
              ? "bg-green-500 border-green-500"
              : cn("hover:scale-110", pm.border),
          )}
        >
          {done && <Check className="h-3 w-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className={cn("text-sm font-medium", done && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          {task.description && !expanded && (
            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {badge && (
              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", badge.cls)}>
                {badge.label}
              </span>
            )}
            {task.priority !== "none" && (
              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", pm.bg, pm.cls)}>
                {pm.label}
              </span>
            )}
            {list && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", getColorDot(list.color))} />
                {list.name}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setExpanded(!expanded); setEditTitle(task.title); setEditDesc(task.description); }}>
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t bg-muted/10">
          <div className="space-y-2 pt-3">
            <Input
              className="font-medium"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title"
            />
            <textarea
              className="w-full text-sm bg-background border border-border rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground min-h-16"
              placeholder="Add a description..."
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => onUpdate(task.id, { priority: v as Task["priority"] })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🟠 Medium</SelectItem>
                  <SelectItem value="low">🔵 Low</SelectItem>
                  <SelectItem value="none">⚪ None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={task.due_date ?? ""}
                onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">List</Label>
              <Select value={task.list_id ?? "none"} onValueChange={(v) => onUpdate(task.id, { list_id: v === "none" ? null : v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No list</SelectItem>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setExpanded(false)}>Cancel</Button>
            <Button size="sm" className="flex-1" onClick={saveEdits} disabled={saving || !editTitle.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Add ────────────────────────────────────────────────────────────────

function QuickAdd({
  lists,
  defaultListId,
  onAdd,
}: {
  lists: TaskList[];
  defaultListId: string | null;
  onAdd: (task: Omit<Task, "id" | "status" | "completed_at" | "created_at" | "order_index">) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("none");
  const [listId, setListId] = useState<string | null>(defaultListId);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { setListId(defaultListId); }, [defaultListId]);

  async function handleAdd() {
    if (!title.trim()) return;
    setAdding(true);
    await onAdd({ title: title.trim(), description: desc, due_date: dueDate || null, priority, list_id: listId });
    setTitle(""); setDesc(""); setDueDate(""); setPriority("none");
    setAdding(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-b"
      >
        <Plus className="h-4 w-4 text-primary" />
        Add task
      </button>
    );
  }

  return (
    <div className="border-b bg-muted/10 p-4 space-y-3">
      <Input
        ref={inputRef}
        placeholder="Task title"
        className="font-medium"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleAdd(); if (e.key === "Escape") setOpen(false); }}
      />
      <textarea
        className="w-full text-sm bg-background border border-border rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground min-h-14"
        placeholder="Description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">🔴 High</SelectItem>
              <SelectItem value="medium">🟠 Medium</SelectItem>
              <SelectItem value="low">🔵 Low</SelectItem>
              <SelectItem value="none">⚪ None</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Due Date</Label>
          <Input type="date" className="h-8 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">List</Label>
          <Select value={listId ?? "none"} onValueChange={(v) => setListId(v === "none" ? null : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No list</SelectItem>
              {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" className="flex-1" onClick={handleAdd} disabled={adding || !title.trim()}>
          {adding ? "Adding..." : "Add Task"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>("all");
  const [loading, setLoading] = useState(true);
  const [listsPanelOpen, setListsPanelOpen] = useState(true);

  // New list dialog
  const [listDialog, setListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("blue");
  const [editingList, setEditingList] = useState<TaskList | null>(null);

  // Completed tasks collapse
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchTasks = useCallback(async (v: View) => {
    setLoading(true);
    try {
      const isSmartView = ["today", "upcoming", "all", "completed"].includes(v);
      const url = isSmartView
        ? `/api/tasks?view=${v}`
        : `/api/tasks?view=all&list_id=${v}`;
      const res = await fetch(url);
      setTasks((await res.json()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  async function fetchLists() {
    const res = await fetch("/api/tasks/lists");
    setLists((await res.json()) ?? []);
    await fetchTasks("all");
  }

  useEffect(() => {
    fetchTasks(view);
  }, [view, fetchTasks]);

  // ─── Task actions ──────────────────────────────────────────────────────────

  async function addTask(taskData: Omit<Task, "id" | "status" | "completed_at" | "created_at" | "order_index">) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskData, order_index: tasks.length }),
    });
    const newTask = await res.json();
    if (shouldShowInView(newTask, view)) {
      setTasks((prev) => [newTask, ...prev]);
    }
    toast.success("Task added");
  }

  function shouldShowInView(task: Task, v: View): boolean {
    const today = toISODate(new Date());
    const sevenDays = toISODate(new Date(Date.now() + 7 * 86400000));
    if (v === "today") return task.status === "pending" && !!task.due_date && task.due_date <= today;
    if (v === "upcoming") return task.status === "pending" && !!task.due_date && task.due_date > today && task.due_date <= sevenDays;
    if (v === "completed") return task.status === "completed";
    if (v === "all") return task.status === "pending";
    return task.status === "pending" && task.list_id === v;
  }

  async function toggleTask(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (view !== "completed" && newStatus === "completed") {
        setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== task.id)), 600);
      }
    } catch {
      setTasks((prev) => prev.map((t) => t.id === task.id ? task : t));
      toast.error("Failed to update task");
    }
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    toast.success("Task deleted");
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  // ─── List actions ──────────────────────────────────────────────────────────

  async function saveList() {
    if (!newListName.trim()) return;
    if (editingList) {
      const res = await fetch(`/api/tasks/lists/${editingList.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName, color: newListColor }),
      });
      const updated = await res.json();
      setLists((prev) => prev.map((l) => l.id === editingList.id ? updated : l));
    } else {
      const res = await fetch("/api/tasks/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName, color: newListColor, order_index: lists.length }),
      });
      const newList = await res.json();
      setLists((prev) => [...prev, newList]);
    }
    setNewListName(""); setNewListColor("blue"); setEditingList(null); setListDialog(false);
  }

  async function deleteList(id: string) {
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (view === id) setView("all");
    await fetch(`/api/tasks/lists/${id}`, { method: "DELETE" });
    toast.success("List deleted");
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const viewLabel = SMART_VIEWS.find((v) => v.id === view)?.label ?? lists.find((l) => l.id === view)?.name ?? "Tasks";
  const isSmartView = ["today", "upcoming", "all", "completed"].includes(view);
  const activeListId = isSmartView ? null : view;

  // Count overdue
  const overdueCount = tasks.filter((t) => t.due_date && t.due_date < toISODate(new Date()) && t.status === "pending").length;

  return (
    <div className="flex h-full overflow-hidden">
      <Toaster richColors />

      {/* ── Left Panel — Lists ── */}
      <div
        className={cn(
          "shrink-0 border-r bg-card flex flex-col transition-all duration-300 overflow-hidden",
          listsPanelOpen ? "w-56" : "w-0 border-r-0",
          "hidden md:flex",
        )}
      >
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Views</span>
        </div>

        {/* Smart views */}
        <div className="p-2 space-y-0.5">
          {SMART_VIEWS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                view === id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", view === id ? "text-primary" : color)} />
              {label}
              {id === "today" && overdueCount > 0 && (
                <span className="ml-auto text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">{overdueCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Lists */}
        <div className="p-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lists</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingList(null); setNewListName(""); setNewListColor("blue"); setListDialog(true); }}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {lists.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">No lists yet</p>
            )}
            {lists.map((list) => (
              <div
                key={list.id}
                role="button"
                tabIndex={0}
                onClick={() => setView(list.id)}
                onKeyDown={(e) => e.key === "Enter" && setView(list.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group cursor-pointer",
                  view === list.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", getColorDot(list.color))} />
                <span className="flex-1 text-left truncate">{list.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => { e.stopPropagation(); setEditingList(list); setNewListName(list.name); setNewListColor(list.color); setListDialog(true); }}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Tasks ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex" onClick={() => setListsPanelOpen(!listsPanelOpen)}>
            {listsPanelOpen ? <ChevronDown className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground">{viewLabel}</h1>
            <p className="text-xs text-muted-foreground">
              {pendingTasks.length} pending{completedTasks.length > 0 ? ` · ${completedTasks.length} done` : ""}
            </p>
          </div>
          {/* Mobile: smart view tabs */}
          <div className="flex md:hidden items-center gap-1">
            {SMART_VIEWS.slice(0, 3).map(({ id, icon: Icon }) => (
              <Button key={id} variant={view === id ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView(id)}>
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile: view switcher row */}
        <div className="md:hidden flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
          {SMART_VIEWS.map(({ id, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={cn("shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors", view === id ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground")}
            >
              {label}
            </button>
          ))}
          {lists.map((l) => (
            <button key={l.id} onClick={() => setView(l.id)}
              className={cn("shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors", view === l.id ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground")}
            >
              <span className={cn("h-2 w-2 rounded-full", getColorDot(l.color))} />
              {l.name}
            </button>
          ))}
          <button onClick={() => { setEditingList(null); setNewListName(""); setNewListColor("blue"); setListDialog(true); }}
            className="shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground"
          >
            <Plus className="h-3 w-3" />New list
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {view !== "completed" && (
            <QuickAdd lists={lists} defaultListId={activeListId} onAdd={addTask} />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {view === "today" ? "Nothing due today 🎉" : view === "upcoming" ? "Clear schedule ahead" : "No tasks yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {view === "completed" ? "Complete some tasks first" : "Add a task to get started"}
              </p>
            </div>
          ) : (
            <Card className="rounded-none border-0 shadow-none">
              <CardContent className="p-0">
                {/* Pending tasks */}
                {pendingTasks.map((task) => (
                  <TaskRow key={task.id} task={task} lists={lists} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} />
                ))}

                {/* Completed section (collapsible, shown in non-completed views) */}
                {completedTasks.length > 0 && view !== "completed" && (
                  <div>
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/20 border-t transition-colors"
                    >
                      {showCompleted ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      Completed ({completedTasks.length})
                    </button>
                    {showCompleted && completedTasks.map((task) => (
                      <TaskRow key={task.id} task={task} lists={lists} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} />
                    ))}
                  </div>
                )}

                {/* Completed view */}
                {view === "completed" && completedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} lists={lists} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── List Dialog ── */}
      <Dialog open={listDialog} onOpenChange={setListDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingList ? "Edit List" : "New List"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">List Name</Label>
              <Input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Work, Personal, Shopping"
                onKeyDown={(e) => e.key === "Enter" && saveList()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {LIST_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewListColor(c.value)}
                    className={cn("h-7 w-7 rounded-full transition-all", c.dot, newListColor === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-70 hover:opacity-100")}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            {editingList && (
              <Button variant="destructive" size="sm" className="w-full" onClick={() => { deleteList(editingList.id); setListDialog(false); }}>
                Delete List
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setListDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveList} disabled={!newListName.trim()}>
                {editingList ? "Save" : "Create List"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
