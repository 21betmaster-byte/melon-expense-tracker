"use client";
import { useEffect } from "react";
import {
  getHousehold,
  getGroups,
  getCategories,
  getGoals,
  getHouseholdMembers,
  getCategoryMemory,
  getSettlements,
  getUserHouseholds,
} from "@/lib/firebase/firestore";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAppStore } from "@/store/useAppStore";

export const useHousehold = () => {
  const {
    user,
    setHousehold,
    setHouseholdLoading,
    setGroups,
    setActiveGroup,
    setAllCategories,
    setGoals,
    setMembers,
    setCategoryMemory,
    setSettlements,
    setAllHouseholds,
    activeGroup,
  } = useAppStore();

  useEffect(() => {
    if (!user?.household_id) {
      setHouseholdLoading(false);
      return;
    }

    const load = async () => {
      setHouseholdLoading(true);
      const [household, groups, categories, goals, categoryMemory, settlements] = await Promise.all([
        getHousehold(user.household_id!),
        getGroups(user.household_id!),
        getCategories(user.household_id!),
        getGoals(user.household_id!),
        getCategoryMemory(user.household_id!),
        getSettlements(user.household_id!),
      ]);

      if (household) {
        setHousehold(household);
        const members = await getHouseholdMembers(household.members);
        setMembers(members);

        // Mark onboarding as completed when household data loads successfully
        // This ensures the feature tour can auto-trigger on dashboard
        if (typeof window !== "undefined") {
          localStorage.setItem("onboarding_completed", "true");
        }
      }
      setGroups(groups);
      setGoals(goals);
      setCategoryMemory(categoryMemory);
      setSettlements(settlements);

      // Determine default group for category migration (F-09)
      const defaultGroup = groups.find((g) => g.is_default) ?? groups[0];

      // Lazy migration: assign group_id to categories that lack it (F-09)
      const migratedCategories = categories.map((cat) => {
        if (cat.group_id) return cat;
        return { ...cat, group_id: defaultGroup?.id };
      });

      // Background Firestore update for migrated categories (fire-and-forget)
      const unmigrated = categories.filter((cat) => !cat.group_id);
      if (unmigrated.length > 0 && defaultGroup) {
        Promise.all(
          unmigrated.map((cat) =>
            updateDoc(
              doc(db, "households", user.household_id!, "categories", cat.id),
              { group_id: defaultGroup.id }
            ).catch(() => console.warn(`Failed to migrate category ${cat.id}`))
          )
        );
      }

      // Set all categories with group_id populated (F-09)
      setAllCategories(migratedCategories);

      // Set default active group if not yet set (triggers category filtering)
      if (!activeGroup && groups.length > 0) {
        setActiveGroup(defaultGroup);
      }

      // ─── Multi-household: fetch all user's households ──────────────
      const householdIds = user.household_ids ?? [];

      // Migration: if household_ids is missing, backfill with current household_id
      if (householdIds.length === 0 && user.household_id) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            household_ids: arrayUnion(user.household_id),
          });
          // Use the current household as the only entry
          if (household) {
            setAllHouseholds([household]);
          }
        } catch {
          console.warn("Failed to migrate household_ids array");
        }
      } else if (householdIds.length > 0) {
        try {
          const allHouseholds = await getUserHouseholds(householdIds);
          setAllHouseholds(allHouseholds);
        } catch {
          console.warn("Failed to fetch all households");
        }
      }

      setHouseholdLoading(false);
    };

    load().catch(() => {
      setHouseholdLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.household_id]);
};
