"use client";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Layers, Plus, Check, Archive, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/store/useAppStore";
import { addGroup, archiveGroup } from "@/lib/firebase/firestore";
import { toast } from "sonner";

export const GroupSwitcher = () => {
  const { groups, activeGroup, setActiveGroup, setGroups, user } = useAppStore();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const activeGroups = useMemo(
    () => groups.filter((g) => !g.is_archived),
    [groups]
  );
  const archivedGroups = useMemo(
    () => groups.filter((g) => g.is_archived),
    [groups]
  );

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed || !user?.household_id) return;

    const duplicate = groups.some(
      (g) => g.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      toast.error("A group with that name already exists.");
      return;
    }

    setCreating(true);
    try {
      const newId = await addGroup(user.household_id, trimmed);
      const newGroup = { id: newId, name: trimmed, is_default: false };
      setGroups([...groups, newGroup]);
      setActiveGroup(newGroup);
      setShowCreate(false);
      setNewGroupName("");
      setOpen(false);
      toast.success(`Group "${trimmed}" created!`);
    } catch {
      toast.error("Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!user?.household_id) return;
    try {
      await archiveGroup(user.household_id, groupId, true);
      const updated = groups.map((g) =>
        g.id === groupId ? { ...g, is_archived: true } : g
      );
      setGroups(updated);
      if (activeGroup?.id === groupId) {
        const nextActive = updated.find((g) => !g.is_archived);
        if (nextActive) setActiveGroup(nextActive);
      }
      toast.success("Group archived");
    } catch {
      toast.error("Failed to archive group.");
    }
  };

  const handleUnarchiveGroup = async (groupId: string) => {
    if (!user?.household_id) return;
    try {
      await archiveGroup(user.household_id, groupId, false);
      const updated = groups.map((g) =>
        g.id === groupId ? { ...g, is_archived: false } : g
      );
      setGroups(updated);
      toast.success("Group restored");
    } catch {
      toast.error("Failed to restore group.");
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setShowCreate(false);
          setShowArchived(false);
          setNewGroupName("");
        }
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800 max-w-[180px]"
                data-testid="group-switcher"
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span className="truncate text-sm">
                  {activeGroup?.name ?? "Select Group"}
                </span>
                <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {(activeGroup?.name?.length ?? 0) > 18 && (
            <TooltipContent>
              <p>{activeGroup?.name}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent
        align="start"
        className="bg-slate-900 border-slate-700 min-w-[200px]"
      >
        <DropdownMenuLabel className="text-slate-400 text-xs">
          Expense Groups
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />

        {/* Active Groups */}
        {activeGroups.map((group) => (
          <div
            key={group.id}
            className="flex items-center justify-between group/item"
          >
            <DropdownMenuItem
              onClick={() => setActiveGroup(group)}
              className={`flex-1 cursor-pointer text-slate-200 focus:bg-slate-800 focus:text-slate-100 ${
                activeGroup?.id === group.id ? "bg-slate-800" : ""
              }`}
            >
              {group.name}
              {group.is_default && (
                <span className="ml-auto text-xs text-slate-500">default</span>
              )}
            </DropdownMenuItem>
            {!group.is_default && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveGroup(group.id);
                }}
                className="p-1 mr-2 text-slate-500 hover:text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity"
                title="Archive group"
                data-testid={`archive-group-${group.id}`}
              >
                <Archive className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        <DropdownMenuSeparator className="bg-slate-700" />

        {/* Archived Groups (expandable section) */}
        {archivedGroups.length > 0 && (
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setShowArchived(!showArchived);
              }}
              className="cursor-pointer text-slate-400 focus:bg-slate-800 focus:text-slate-300 gap-2 text-xs"
              data-testid="show-archived-groups"
            >
              <Archive className="w-3 h-3" />
              Archived Groups ({archivedGroups.length})
              <ChevronDown
                className={`w-3 h-3 ml-auto transition-transform ${
                  showArchived ? "rotate-180" : ""
                }`}
              />
            </DropdownMenuItem>
            {showArchived && (
              <>
                {archivedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between pl-4"
                  >
                    <DropdownMenuItem
                      onClick={() => setActiveGroup(group)}
                      className="flex-1 cursor-pointer text-slate-400 focus:bg-slate-800 focus:text-slate-300"
                    >
                      {group.name}
                    </DropdownMenuItem>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnarchiveGroup(group.id);
                      }}
                      className="p-1 mr-2 text-slate-500 hover:text-green-400 transition-colors"
                      title="Restore group"
                      data-testid={`unarchive-group-${group.id}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </>
            )}
            <DropdownMenuSeparator className="bg-slate-700" />
          </>
        )}

        {/* Create new group */}
        {!showCreate ? (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setShowCreate(true);
            }}
            className="cursor-pointer text-slate-300 focus:bg-slate-800 focus:text-slate-100 gap-2"
            data-testid="create-group-switcher-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Create new group
          </DropdownMenuItem>
        ) : (
          <div
            className="flex items-center gap-1.5 px-2 py-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newGroupName.trim()) {
                handleCreateGroup();
              }
            }}
          >
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="h-7 text-xs bg-slate-800 border-slate-700"
              maxLength={30}
              autoFocus
              data-testid="switcher-group-name-input"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0"
              disabled={!newGroupName.trim() || creating}
              onClick={handleCreateGroup}
              data-testid="switcher-group-confirm-btn"
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
