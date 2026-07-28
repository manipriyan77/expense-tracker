"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Loader2 } from "lucide-react";
import { useLookupsStore } from "@/store/lookups-store";

interface TagPickerModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly selectedTags: string[];
  readonly onSave: (tags: string[]) => void | Promise<void>;
}

export function TagPickerModal({ open, onOpenChange, selectedTags, onSave }: TagPickerModalProps) {
  const { tags: managedTags, fetchLookups, addLookup, fetched } = useLookupsStore();
  const [draft, setDraft] = useState<string[]>(selectedTags);
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(selectedTags);
      if (!fetched) fetchLookups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleTag = (name: string) => {
    setDraft((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    await addLookup("tag", name);
    setDraft((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setNewTagName("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Tags</DialogTitle>
          <DialogDescription>Select existing tags or create a new one.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {managedTags.length === 0 && (
              <p className="text-xs text-muted-foreground">No tags yet — create one below.</p>
            )}
            {managedTags.map((tag) => {
              const isSelected = draft.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {tag.name}
                  {isSelected && <X className="h-3 w-3" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="New tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
              className="h-9 text-sm"
            />
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1" onClick={handleCreateTag}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
