import { userProfileManager } from "./user-profile-manager.js";
import { CONFIG } from "../../config.js";
import type { UserProfileData } from "./types.js";
import { sortProfileItems } from "../../utils/profile.js";
import { log } from "../logger.js";

function dedupByCategory(items: any[], topN: number): any[] {
  if (items.length <= topN) return items;
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of items) {
    if (seen.has(item.category)) continue;
    seen.add(item.category);
    result.push(item);
    if (result.length >= topN) break;
  }
  return result;
}

function scoreByRecency(items: any[]): any[] {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const ageA = (now - (a.lastSeen || 0)) / (24 * 60 * 60 * 1000);
    const ageB = (now - (b.lastSeen || 0)) / (24 * 60 * 60 * 1000);
    const scoreA = (a.confidence || 0) * 0.7 + Math.exp(-ageA / 90) * 0.3;
    const scoreB = (b.confidence || 0) * 0.7 + Math.exp(-ageB / 90) * 0.3;
    return scoreB - scoreA;
  });
}

function escapeXmlText(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlAttr(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getUserProfileContext(userId: string): string | null {
  const profile = userProfileManager.getActiveProfile(userId);

  if (!profile) {
    return null;
  }

  const profileData: UserProfileData = JSON.parse(profile.profileData);
  const parts: string[] = [];

  const injectPrefs = CONFIG.userProfileInjectPreferences ?? 5;
  const injectPats = CONFIG.userProfileInjectPatterns ?? 5;
  const injectWfs = CONFIG.userProfileInjectWorkflows ?? 3;

  const sortedPrefs =
    profileData.preferences.length > 0
      ? (sortProfileItems(profileData.preferences as any[], "confidence") as any[])
      : [];
  const sortedPats =
    profileData.patterns.length > 0
      ? (sortProfileItems(profileData.patterns as any[], "frequency") as any[])
      : [];
  const sortedWfs =
    profileData.workflows.length > 0
      ? (sortProfileItems(profileData.workflows as any[], "frequency") as any[])
      : [];

  const topPrefs = dedupByCategory(
    scoreByRecency(sortedPrefs.slice(0, injectPrefs * 2)),
    injectPrefs
  );
  const topPats = dedupByCategory(sortedPats, injectPats);
  const topWfs = sortedWfs.slice(0, injectWfs);

  if (topPrefs.length > 0) {
    parts.push("<user_preferences>");
    topPrefs.forEach((pref: any) => {
      parts.push(
        `<user_preference category="${escapeXmlAttr(pref.category)}">${escapeXmlText(pref.description)}</user_preference>`
      );
    });
    parts.push("</user_preferences>");
  }

  if (topPats.length > 0) {
    parts.push("<user_patterns>");
    topPats.forEach((pattern: any) => {
      parts.push(
        `<user_pattern category="${escapeXmlAttr(pattern.category)}">${escapeXmlText(pattern.description)}</user_pattern>`
      );
    });
    parts.push("</user_patterns>");
  }

  if (topWfs.length > 0) {
    parts.push("<user_workflows>");
    topWfs.forEach((workflow: any) => {
      const frequency = workflow.frequency || 1;
      const steps = workflow.steps?.length
        ? ` (${frequency}x: ${workflow.steps.join(" → ")})`
        : ` (${frequency}x)`;
      parts.push(
        `<user_workflow frequency="${frequency}x">${escapeXmlText(workflow.description)}${steps}</user_workflow>`
      );
    });
    parts.push("</user_workflows>");
  }

  if ((profileData as any).learning_paths?.length > 0) {
    parts.push("<learning_paths>");
    (profileData as any).learning_paths.slice(0, 3).forEach((path: any) => {
      parts.push(
        `<learning_path topic="${escapeXmlAttr(path.topic)}">${escapeXmlText(path.description)}</learning_path>`
      );
    });
    parts.push("</learning_paths>");
  }

  if (parts.length === 0) {
    return null;
  }

  const text = parts.join("\n");

  if (topPrefs.length + topPats.length + topWfs.length > 0) {
    log("profile inject", {
      prefs: topPrefs.map((p: any) => `[${p.category}] ${p.description}`.substring(0, 80)),
      pats: topPats.map((p: any) => `[${p.category}] ${p.description}`.substring(0, 80)),
      wfs: topWfs.map((w: any) => w.description.substring(0, 80)),
    });
  }

  return text;
}
