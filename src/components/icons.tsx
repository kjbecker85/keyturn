// One place for every icon, so the same thing always wears the same mark.
// Phosphor icons, duotone weight: a solid shape with a tinted second layer.
import {
  ArrowRight,
  BracketsCurly,
  Buildings,
  Calculator,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  Circle,
  CircleDashed,
  CircleHalf,
  ClockCounterClockwise,
  Database,
  EyeSlash,
  Fire,
  GitDiff,
  Handshake,
  Info,
  Key,
  Lightning,
  ListChecks,
  MagnifyingGlass,
  MapTrifold,
  Megaphone,
  Moon,
  Package,
  PaperPlaneTilt,
  Prohibit,
  Receipt,
  Rows,
  Scales,
  ShieldCheck,
  SignOut,
  Sparkle,
  SquaresFour,
  Sun,
  SunHorizon,
  Tray,
  UserCirclePlus,
  UsersThree,
  Warning,
  WarningDiamond,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { Area } from "@/lib/data/types";

export {
  ArrowRight,
  Buildings,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  Key,
  Lightning,
  MagnifyingGlass,
  Moon,
  Rows,
  SignOut,
  Sparkle,
  Sun,
  UserCirclePlus,
};
export type { Icon };

export const AREA_ICON: Record<Area, Icon> = {
  rent_roll: Receipt,
  checklist: ListChecks,
  vendors: Handshake,
  cross_sheet: GitDiff,
};

export const SEVERITY_ICON: Record<number, Icon> = {
  1: Fire,
  2: WarningDiamond,
  3: Warning,
  4: Info,
};

export const STATUS_ICON: Record<string, Icon> = {
  open: CircleDashed,
  resolved: CheckCircle,
  dismissed: EyeSlash,
  "Not Started": Circle,
  "In Progress": CircleHalf,
  Blocked: Prohibit,
  Complete: CheckCircle,
};

export const FUNCTION_ICON: Record<string, Icon> = {
  Accounting: Calculator,
  Operations: Wrench,
  HR: UsersThree,
  Systems: Database,
  Marketing: Megaphone,
  Risk: ShieldCheck,
  Procurement: Package,
};

export const NAV_ICON: Record<string, Icon> = {
  "/": SquaresFour,
  "/inbox": Tray,
  "/inbox/triage": Lightning,
  "/properties": MapTrifold,
  "/tasks": ListChecks,
  "/vendors": Handshake,
  "/rent-roll": Receipt,
  "/ask": Sparkle,
  "/drafts": PaperPlaneTilt,
  "/brief": SunHorizon,
  "/activity": ClockCounterClockwise,
  "/about": Scales,
  "/rules": BracketsCurly,
  "/contradictions": GitDiff,
  "/business-case": Calculator,
  "/more": Rows,
};
