"use client";

import { useState } from "react";
import { useLearning } from "../learning-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import type { LearningTopic } from "../learning-context";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#64748b",
];

function TopicForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<LearningTopic>;
  onSave: (data: Omit<LearningTopic, "id" | "created_at">) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), color, description: description.trim() || null, icon: null });
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input placeholder="e.g. React, Spanish, Math…" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-7 rounded-full cursor-pointer border-0 bg-transparent p-0"
            title="Custom color"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <Textarea
          placeholder="What does this topic cover?"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={saving || !name.trim()} onClick={handleSave}>
          {saving ? "Saving…" : "Save Topic"}
        </Button>
      </div>
    </div>
  );
}

export default function LearningTopicsPage() {
  const { topics, sessions, addTopic, updateTopic, deleteTopic, loadingTopics } = useLearning();
  const [addOpen, setAddOpen] = useState(false);
  const [editTopic, setEditTopic] = useState<LearningTopic | null>(null);

  function sessionCount(topicId: string) {
    return sessions.filter((s) => s.topic_id === topicId).length;
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Topics</h1>
          <p className="text-sm text-muted-foreground">Manage your learning subjects</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> New Topic
        </Button>
      </div>

      {loadingTopics ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <p className="text-muted-foreground text-sm">No topics yet. Add your first subject to get started.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Topic
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => {
            const count = sessionCount(topic.id);
            return (
              <Card key={topic.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ background: topic.color + "22", border: `2px solid ${topic.color}` }}>
                    <div className="h-3.5 w-3.5 rounded-full" style={{ background: topic.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{topic.name}</p>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{count} session{count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTopic(topic)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTopic(topic.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Topic</DialogTitle></DialogHeader>
          <TopicForm
            onSave={async (data) => { await addTopic(data); setAddOpen(false); }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTopic} onOpenChange={(o) => !o && setEditTopic(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Topic</DialogTitle></DialogHeader>
          {editTopic && (
            <TopicForm
              initial={editTopic}
              onSave={async (data) => { await updateTopic(editTopic.id, data); setEditTopic(null); }}
              onCancel={() => setEditTopic(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
