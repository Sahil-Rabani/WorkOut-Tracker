import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Dumbbell, Flame, Trophy, Star, Plus, Pencil, Trash2, Copy, ChevronUp,
  ChevronDown, ChevronLeft, ChevronRight, Check, X, Settings as SettingsIcon,
  Calendar as CalendarIcon, BarChart3, Award, Home, Target, Download, Upload,
  RotateCcw, Sparkles, Crown, Swords, Sun, Moon, Info, Minus, ListChecks,
  GripVertical, Bell, BellOff, Search, Layers, Coffee, Undo2, Volume2, VolumeX,
  Keyboard, FileDown, Eye,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import * as Tone from "tone";
import Papa from "papaparse";

/* ============================== CONSTANTS ============================== */

const STORAGE_KEY = "solo-leveling-tracker-state-v1";

const CATEGORY_META = {
  Strength: { color: "#a855f7", xp: 50, icon: "💪" },
  Cardio: { color: "#3b82f6", xp: 35, icon: "🏃" },
  Core: { color: "#8b5cf6", xp: 30, icon: "🔥" },
  Legs: { color: "#6366f1", xp: 45, icon: "🦵" },
  Mobility: { color: "#06b6d4", xp: 20, icon: "🧘" },
  Custom: { color: "#ec4899", xp: 25, icon: "✨" },
};
const CATEGORIES = Object.keys(CATEGORY_META);
const UNITS = ["reps", "seconds", "minutes", "km", "meters", "sets", "custom"];
const UNIT_STEP = { reps: 1, sets: 1, seconds: 5, minutes: 1, km: 0.1, meters: 25, custom: 1 };

const RANKS = [
  { name: "E", min: 0, color: "#9ca3af" },
  { name: "D", min: 200, color: "#4ade80" },
  { name: "C", min: 600, color: "#38bdf8" },
  { name: "B", min: 1500, color: "#818cf8" },
  { name: "A", min: 3500, color: "#c084fc" },
  { name: "S", min: 7000, color: "#f0abfc" },
  { name: "National", min: 15000, color: "#fb923c" },
  { name: "Monarch", min: 30000, color: "#facc15" },
];

const QUOTES = [
  "I alone level up.",
  "Arise.",
  "The weak have no right to choose how they die.",
  "A hunter who doesn't grow stronger is no hunter at all.",
  "Limits exist only in the mind that accepts them.",
  "Every rep is a step out of the E-rank dungeon.",
  "Power is not given. It is taken, one quest at a time.",
  "The System does not lie. Only you can fail it.",
  "Today's grind is tomorrow's rank-up.",
  "Even a Shadow Monarch started as an E-rank.",
];

const ACHIEVEMENT_DEFS = [
  { id: "first_workout", name: "First Workout", desc: "Complete your first exercise", icon: Dumbbell, check: (s) => s.totalReps > 0 },
  { id: "streak_7", name: "7-Day Streak", desc: "Reach a 7-day streak", icon: Flame, check: (s) => s.streak >= 7 },
  { id: "streak_30", name: "30-Day Streak", desc: "Reach a 30-day streak", icon: Flame, check: (s) => s.streak >= 30 },
  { id: "streak_100", name: "100-Day Streak", desc: "Reach a 100-day streak", icon: Flame, check: (s) => s.streak >= 100 },
  { id: "pushups_100", name: "100 Push-ups", desc: "Log 100 total push-ups", icon: Dumbbell, check: (s) => s.pushupTotal >= 100 },
  { id: "reps_1000", name: "1000 Total Reps", desc: "Log 1000 total repetitions", icon: Target, check: (s) => s.totalReps >= 1000 },
  { id: "reps_10000", name: "10000 Total Reps", desc: "Log 10000 total repetitions", icon: Target, check: (s) => s.totalReps >= 10000 },
  { id: "xp_10000", name: "XP Collector", desc: "Reach 10,000 XP", icon: Award, check: (s) => s.xp >= 10000 },
  { id: "level_10", name: "Level 10", desc: "Reach Level 10", icon: Star, check: (s) => s.level >= 10 },
  { id: "level_25", name: "Level 25", desc: "Reach Level 25", icon: Star, check: (s) => s.level >= 25 },
  { id: "quests_100", name: "100 Daily Quests", desc: "Complete 100 daily quests", icon: Trophy, check: (s) => s.completeDays >= 100 },
  { id: "quests_250", name: "250 Daily Quests", desc: "Complete 250 daily quests", icon: Trophy, check: (s) => s.completeDays >= 250 },
  { id: "workouts_50", name: "50 Workouts Logged", desc: "Complete 50 workout days", icon: CalendarIcon, check: (s) => s.totalWorkouts >= 50 },
  { id: "target_100", name: "Target Master", desc: "Reach a daily target of 100 or more", icon: BarChart3, check: (s) => s.highestTarget >= 100 },
  { id: "perfect_month", name: "Perfect Month", desc: "Complete every quest in a calendar month", icon: CalendarIcon, check: (s) => s.perfectMonth },
  { id: "legendary", name: "Legendary Hunter", desc: "Reach Monarch rank", icon: Crown, check: (s) => s.rank.name === "Monarch" },
];

const DEFAULT_EXERCISES = [
  { name: "Push-ups", emoji: "💪", category: "Strength", unit: "reps", start: 12, increment: 2, min: 0, max: null, notes: "Keep your body straight, lower chest close to the floor, then press up." },
  { name: "Diamond Push-ups", emoji: "💎", category: "Strength", unit: "reps", start: 6, increment: 1, min: 0, max: null, notes: "Place hands close together and keep elbows tight to your sides." },
  { name: "Pike Push-ups", emoji: "🗼", category: "Strength", unit: "reps", start: 6, increment: 1, min: 0, max: null, notes: "Hands on the floor, hips high, bend elbows to bring head toward the floor." },
  { name: "Dips", emoji: "💪", category: "Strength", unit: "reps", start: 6, increment: 1, min: 0, max: null, notes: "Lower slowly until elbows bend around 90 degrees, then press up." },
  { name: "Sit-ups", emoji: "🔥", category: "Core", unit: "reps", start: 15, increment: 2, min: 0, max: null, notes: "Roll your shoulders off the floor, avoid pulling your neck." },
  { name: "Plank", emoji: "🧘", category: "Core", unit: "seconds", start: 30, increment: 5, min: 0, max: null, notes: "Brace your core and keep your hips level with your shoulders." },
  { name: "Mountain Climbers", emoji: "🏔️", category: "Core", unit: "reps", start: 12, increment: 2, min: 0, max: null, notes: "Drive knees toward the chest while keeping your hips stable." },
  { name: "Dead Bug", emoji: "🧠", category: "Core", unit: "reps", start: 10, increment: 2, min: 0, max: null, notes: "Keep your lower back pressed into the floor while moving opposite limbs." },
  { name: "Squats", emoji: "🦵", category: "Legs", unit: "reps", start: 15, increment: 2, min: 0, max: null, notes: "Sit back and down, keep knees tracking over toes." },
  { name: "Lunges", emoji: "🦿", category: "Legs", unit: "reps", start: 10, increment: 2, min: 0, max: null, notes: "Step forward, lower until both knees bend, then push back up." },
  { name: "Glute Bridges", emoji: "🦿", category: "Legs", unit: "reps", start: 12, increment: 2, min: 0, max: null, notes: "Drive through your heels and squeeze your glutes at the top." },
  { name: "Calf Raises", emoji: "🦶", category: "Legs", unit: "reps", start: 12, increment: 2, min: 0, max: null, notes: "Raise onto your toes slowly and pause at the top." },
  { name: "Running", emoji: "🏃", category: "Cardio", unit: "km", start: 1.5, increment: 0.2, min: 0, max: null, notes: "Keep a steady pace and controlled breathing." },
  { name: "Burpees", emoji: "⚡", category: "Cardio", unit: "reps", start: 8, increment: 1, min: 0, max: null, notes: "Drop to the floor, jump or step back, then stand up explosively." },
  { name: "Jumping Jacks", emoji: "⭐", category: "Cardio", unit: "reps", start: 15, increment: 3, min: 0, max: null, notes: "Jump lightly and land softly to protect your knees." },
  { name: "Shoulder Taps", emoji: "🤲", category: "Mobility", unit: "reps", start: 12, increment: 2, min: 0, max: null, notes: "Hold a straight plank and tap opposite shoulders alternately." },
  { name: "Superman", emoji: "🦴", category: "Mobility", unit: "reps", start: 10, increment: 2, min: 0, max: null, notes: "Lift chest, arms, and legs slightly off the floor without overextending." },
  { name: "High Knees", emoji: "👟", category: "Cardio", unit: "reps", start: 20, increment: 2, min: 0, max: null, notes: "Drive knees up quickly while keeping a quick rhythm." },
];

const ACCENTS = [
  { name: "Monarch Purple", value: "#a855f7" },
  { name: "Mana Blue", value: "#3b82f6" },
  { name: "Shadow Pink", value: "#ec4899" },
  { name: "Gate Cyan", value: "#06b6d4" },
  { name: "Rank-S Gold", value: "#f59e0b" },
];

/* Built-in exercise templates. Each entry is a list of exercise definitions
   in the same shape as DEFAULT_EXERCISES. */
const BUILTIN_TEMPLATES = {
  "Solo Leveling Classic": [
    { name: "Push-ups", emoji: "💪", category: "Strength", unit: "reps", start: 10, increment: 2 },
    { name: "Sit-ups", emoji: "🔥", category: "Core", unit: "reps", start: 10, increment: 2 },
    { name: "Squats", emoji: "🦵", category: "Legs", unit: "reps", start: 10, increment: 2 },
    { name: "Running", emoji: "🏃", category: "Cardio", unit: "km", start: 1, increment: 0.2 },
  ],
  "Daily Progressive Full Body": [
    { name: "Upper Body: Push-ups", emoji: "💪", category: "Strength", unit: "reps", start: 10, increment: 2, notes: "Keep your body straight, lower chest close to the floor, then press up." },
    { name: "Upper Body: Diamond Push-ups", emoji: "💎", category: "Strength", unit: "reps", start: 5, increment: 1, notes: "Place hands close together and keep elbows tight to your sides." },
    { name: "Upper Body: Pike Push-ups", emoji: "🗼", category: "Strength", unit: "reps", start: 5, increment: 1, notes: "Hands on the floor, hips high, bend elbows to bring head toward the floor." },
    { name: "Upper Body: Dips", emoji: "💪", category: "Strength", unit: "reps", start: 5, increment: 1, notes: "Lower slowly until elbows bend around 90 degrees, then press up." },
    { name: "Core: Sit-ups", emoji: "🔥", category: "Core", unit: "reps", start: 10, increment: 2, notes: "Roll your shoulders off the floor, avoid pulling your neck." },
    { name: "Core: Plank", emoji: "🧘", category: "Core", unit: "seconds", start: 30, increment: 5, notes: "Brace your core and keep your hips level with your shoulders." },
    { name: "Core: Mountain Climbers", emoji: "🏔️", category: "Core", unit: "reps", start: 10, increment: 2, notes: "Drive knees toward the chest while keeping your hips stable." },
    { name: "Core: Dead Bug", emoji: "🧠", category: "Core", unit: "reps", start: 10, increment: 2, notes: "Keep your lower back pressed into the floor while moving opposite limbs." },
    { name: "Lower Body: Squats", emoji: "🦵", category: "Legs", unit: "reps", start: 10, increment: 2, notes: "Sit back and down, keep knees tracking over toes." },
    { name: "Lower Body: Lunges", emoji: "🦿", category: "Legs", unit: "reps", start: 10, increment: 2, notes: "Step forward, lower until both knees bend, then push back up." },
    { name: "Lower Body: Glute Bridges", emoji: "🦿", category: "Legs", unit: "reps", start: 10, increment: 2, notes: "Drive through your heels and squeeze your glutes at the top." },
    { name: "Lower Body: Calf Raises", emoji: "🦶", category: "Legs", unit: "reps", start: 10, increment: 2, notes: "Raise onto your toes slowly and pause at the top." },
    { name: "Cardio: Running", emoji: "🏃", category: "Cardio", unit: "km", start: 0.5, increment: 0.2, notes: "Keep a steady pace and controlled breathing." },
    { name: "Cardio: Burpees", emoji: "⚡", category: "Cardio", unit: "reps", start: 8, increment: 1, notes: "Drop to the floor, jump or step back, then stand up explosively." },
    { name: "Cardio: Jumping Jacks", emoji: "⭐", category: "Cardio", unit: "reps", start: 15, increment: 3, notes: "Jump lightly and land softly to protect your knees." },
    { name: "Cardio: High Knees", emoji: "👟", category: "Cardio", unit: "reps", start: 20, increment: 2, notes: "Drive knees up quickly while keeping a quick rhythm." },
    { name: "Mobility: Shoulder Taps", emoji: "🤲", category: "Mobility", unit: "reps", start: 10, increment: 2, notes: "Hold a straight plank and tap opposite shoulders alternately." },
    { name: "Mobility: Superman", emoji: "🦴", category: "Mobility", unit: "reps", start: 10, increment: 2, notes: "Lift chest, arms, and legs slightly off the floor without overextending." },
  ],
  Beginner: [
    { name: "Wall Push-ups", emoji: "🧱", category: "Strength", unit: "reps", start: 8, increment: 1 },
    { name: "Chair Squats", emoji: "🪑", category: "Legs", unit: "reps", start: 8, increment: 1 },
    { name: "Walking", emoji: "🚶", category: "Cardio", unit: "minutes", start: 10, increment: 1 },
    { name: "Stretching", emoji: "🤸", category: "Mobility", unit: "minutes", start: 5, increment: 0.5 },
  ],
  "Home Workout": [
    { name: "Push-ups", emoji: "💪", category: "Strength", unit: "reps", start: 10, increment: 2, notes: "Keep your body straight and lower with control." },
    { name: "Squats", emoji: "🦵", category: "Legs", unit: "reps", start: 12, increment: 2, notes: "Sit down with your chest up and stand tall." },
    { name: "Plank", emoji: "🧘", category: "Core", unit: "seconds", start: 30, increment: 5, notes: "Brace your core and avoid letting your hips sag." },
    { name: "Jumping Jacks", emoji: "⭐", category: "Cardio", unit: "reps", start: 15, increment: 3, notes: "Jump lightly and land softly to protect your knees." },
    { name: "Lunges", emoji: "🦿", category: "Legs", unit: "reps", start: 10, increment: 2, notes: "Alternate legs and keep your balance steady." },
  ],
  Gym: [
    { name: "Bench Press", emoji: "🏋️", category: "Strength", unit: "reps", start: 8, increment: 1, max: 15, notes: "Keep wrists straight and lower with control." },
    { name: "Deadlift", emoji: "🏋️", category: "Strength", unit: "reps", start: 6, increment: 1, max: 12, notes: "Keep your back flat and drive through your heels." },
    { name: "Lat Pulldown", emoji: "🏋️", category: "Strength", unit: "reps", start: 10, increment: 1, notes: "Pull the bar to your upper chest and control the return." },
    { name: "Leg Press", emoji: "🦵", category: "Legs", unit: "reps", start: 10, increment: 2, notes: "Press through your whole foot and avoid locking your knees." },
  ],
  Cardio: [
    { name: "Running", emoji: "🏃", category: "Cardio", unit: "km", start: 1, increment: 0.25 },
    { name: "Jump Rope", emoji: "🪢", category: "Cardio", unit: "minutes", start: 3, increment: 0.25 },
    { name: "Cycling", emoji: "🚴", category: "Cardio", unit: "km", start: 2, increment: 0.5 },
    { name: "Burpees", emoji: "🔥", category: "Cardio", unit: "reps", start: 8, increment: 1 },
  ],
  Strength: [
    { name: "Push-ups", emoji: "💪", category: "Strength", unit: "reps", start: 12, increment: 2 },
    { name: "Pull-ups", emoji: "🏋️", category: "Strength", unit: "reps", start: 3, increment: 1, max: 20 },
    { name: "Squats", emoji: "🦵", category: "Legs", unit: "reps", start: 15, increment: 2 },
    { name: "Dips", emoji: "💪", category: "Strength", unit: "reps", start: 5, increment: 1 },
  ],
  Core: [
    { name: "Sit-ups", emoji: "🔥", category: "Core", unit: "reps", start: 10, increment: 2 },
    { name: "Plank", emoji: "🧘", category: "Core", unit: "seconds", start: 30, increment: 5 },
    { name: "Russian Twists", emoji: "🌀", category: "Core", unit: "reps", start: 16, increment: 2 },
    { name: "Leg Raises", emoji: "🦵", category: "Core", unit: "reps", start: 10, increment: 2 },
  ],
  Flexibility: [
    { name: "Hamstring Stretch", emoji: "🤸", category: "Mobility", unit: "seconds", start: 20, increment: 5 },
    { name: "Hip Openers", emoji: "🧘", category: "Mobility", unit: "minutes", start: 2, increment: 0.5 },
    { name: "Shoulder Mobility", emoji: "🤲", category: "Mobility", unit: "reps", start: 10, increment: 1 },
    { name: "Yoga Flow", emoji: "🧘", category: "Mobility", unit: "minutes", start: 5, increment: 1 },
  ],
};
const TEMPLATE_NAMES = Object.keys(BUILTIN_TEMPLATES);

/* =============================== HELPERS ================================ */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayKey = (d = new Date()) => d.toLocaleDateString("en-CA");
const pad2 = (n) => String(n).padStart(2, "0");
const dateKeyFor = (y, m, day) => `${y}-${pad2(m + 1)}-${pad2(day)}`;
const daysBetween = (startStr, endStr) => {
  const a = new Date(startStr + "T00:00:00");
  const b = new Date(endStr + "T00:00:00");
  return Math.round((b - a) / 86400000);
};
const clamp = (v, lo, hi) => Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, v));

/* Days used for the daily-target formula, with rest/vacation days excluded
   so progression pauses while paused. */
function effectiveDays(startDate, restDates, dateStr) {
  const raw = daysBetween(startDate, dateStr);
  let rested = 0;
  for (const rd of restDates || []) if (rd > startDate && rd <= dateStr) rested++;
  return Math.max(raw - rested, 0);
}

/* Derives current + longest streak straight from history (+ live today
   status) rather than an incrementally-stored counter, so missed-day
   recovery and rest days can change the streak retroactively and correctly. */
function computeStreakInfo(data, todayStatus) {
  const start = new Date(data.startDate + "T00:00:00");
  const end = new Date(todayKey() + "T00:00:00");
  let longest = 0, run = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = todayKey(d);
    const isToday = key === todayKey();
    let status;
    if (data.restDates?.includes(key)) status = "rest";
    else if (isToday) status = todayStatus;
    else {
      const h = data.history[key];
      status = h ? (h.recovered ? "complete" : h.status) : null;
    }
    if (status === "rest" || status === null) continue;
    if (status === "complete") { run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  return { current: run, longest };
}

function computeTarget(ex, daysSinceStart) {
  let val = ex.start + ex.increment * Math.max(daysSinceStart, 0);
  if (ex.max !== null && ex.max !== undefined && ex.max !== "") val = Math.min(val, ex.max);
  if (ex.min !== null && ex.min !== undefined && ex.min !== "") val = Math.max(val, ex.min);
  const decimals = ["km", "minutes"].includes(ex.unit) ? 2 : 0;
  const factor = Math.pow(10, decimals);
  return Math.max(Math.round(val * factor) / factor, 0);
}

function fmtVal(v, unit) {
  if (["km", "minutes"].includes(unit)) return Number(v.toFixed(2)).toString();
  return String(Math.round(v));
}

function xpForLevel(level) {
  return Math.round(100 * Math.pow(level, 1.4));
}
function levelFromXP(xp) {
  let level = 1, cum = 0;
  while (true) {
    const need = xpForLevel(level);
    if (cum + need > xp || level > 999) break;
    cum += need;
    level++;
  }
  const xpForNext = xpForLevel(level);
  const xpIntoLevel = xp - cum;
  return { level, xpIntoLevel, xpForNext, progress: xpForNext > 0 ? xpIntoLevel / xpForNext : 0 };
}
function getRank(xp) {
  let r = RANKS[0];
  for (const rk of RANKS) if (xp >= rk.min) r = rk;
  return r;
}
function nextRank(xp) {
  return RANKS.find((r) => r.min > xp) || null;
}

function makeExercise(overrides = {}) {
  return {
    id: uid(),
    name: "New Exercise",
    emoji: "⭐",
    category: "Custom",
    unit: "reps",
    start: 10,
    increment: 2,
    min: 0,
    max: null,
    notes: "",
    enabled: true,
    favorite: false,
    completedToday: 0,
    totalCompleted: 0,
    xpAwardedToday: 0,
    awarded: false,
    timesAwarded: 0,
    ...overrides,
  };
}

function makeDefaultData() {
  const today = todayKey();
  return {
    startDate: today,
    lastActiveDate: today,
    xp: 0,
    bonusXPToday: 0,
    questBonusAwardedToday: false,
    history: {},
    achievementsUnlocked: [],
    restDates: [],
    recoveryTokensAvailable: 3,
    customTemplates: [],
    notifiedSlotsToday: [],
    settings: {
      accent: "#a855f7",
      theme: "dark",
      defaultStart: 10,
      defaultIncrement: 2,
      xpMultiplier: 1,
      soundEffects: true,
      animations: true,
      highContrast: false,
      weeklyGoalDays: 5,
      monthlyGoalDays: 20,
      notificationsEnabled: false,
      reminderTimes: [],
    },
    exercises: DEFAULT_EXERCISES.map((e) => makeExercise(e)),
  };
}

/* Safe storage wrappers */
async function safeGet(key) {
  try {
    if (!window.storage) return null;
    const r = await window.storage.get(key, false);
    return r ? r.value : null;
  } catch {
    return null;
  }
}
async function safeSet(key, value) {
  try {
    if (!window.storage) return false;
    const r = await window.storage.set(key, value, false);
    return !!r;
  } catch {
    return false;
  }
}

/* Roll the save forward from lastActiveDate to today, closing out any
   elapsed days into history (complete / partial / missed / rest). Streaks
   are derived later from this history rather than stored incrementally. */
function rollForward(input) {
  let cur = JSON.parse(JSON.stringify(input));
  cur.restDates = cur.restDates || [];
  cur.notifiedSlotsToday = cur.notifiedSlotsToday || [];
  const today = todayKey();
  let changed = false;
  let guard = 0;
  while (cur.lastActiveDate !== today && guard < 3650) {
    guard++;
    changed = true;
    const closingDay = cur.lastActiveDate;
    if (cur.restDates.includes(closingDay)) {
      cur.history[closingDay] = { status: "rest", totalReps: 0, completedCount: 0, totalCount: 0, xpEarned: 0 };
    } else {
      const dss = effectiveDays(cur.startDate, cur.restDates, closingDay);
      const enabled = cur.exercises.filter((e) => e.enabled);
      let totalReps = 0, completedCount = 0;
      enabled.forEach((e) => {
        const target = computeTarget(e, dss);
        totalReps += e.completedToday || 0;
        if (target > 0 && (e.completedToday || 0) >= target) completedCount++;
      });
      const totalCount = enabled.length;
      const status = totalCount > 0 && completedCount === totalCount ? "complete" : totalReps > 0 ? "partial" : "missed";
      const xpEarned = enabled.reduce((s, e) => s + (e.xpAwardedToday || 0), 0) + (cur.bonusXPToday || 0);
      cur.history[closingDay] = { status, totalReps, completedCount, totalCount, xpEarned };
    }
    cur.exercises = cur.exercises.map((e) => ({ ...e, completedToday: 0, xpAwardedToday: 0, awarded: false }));
    cur.bonusXPToday = 0;
    cur.questBonusAwardedToday = false;
    cur.notifiedSlotsToday = [];
    const next = new Date(closingDay + "T00:00:00");
    next.setDate(next.getDate() + 1);
    cur.lastActiveDate = todayKey(next);
  }
  return { data: cur, changed };
}

/* ================================ APP ==================================== */

export default function App() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [toasts, setToasts] = useState([]);
  const [questCompletePulse, setQuestCompletePulse] = useState(false);
  const [modalExercise, setModalExercise] = useState(null); // {mode:'add'|'edit', data}
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const fileInputRef = useRef(null);
  const skipFirstSave = useRef(true);
  const wasAllCompleteRef = useRef(false);
  const prevLevelRef = useRef(null);
  const soundEnabledRef = useRef(true);
  const synthsRef = useRef(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const getSynths = useCallback(() => {
    if (!synthsRef.current) {
      synthsRef.current = {
        blip: new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination(),
        chord: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.15, release: 0.5 } }).toDestination(),
        fanfare: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.4 } }).toDestination(),
      };
    }
    return synthsRef.current;
  }, []);

  const playSound = useCallback((type) => {
    if (!soundEnabledRef.current) return;
    try {
      Tone.start();
      const s = getSynths();
      const now = Tone.now();
      if (type === "complete") s.blip.triggerAttackRelease("C5", "16n", now);
      else if (type === "quest") s.chord.triggerAttackRelease(["C4", "E4", "G4", "C5"], "8n", now);
      else if (type === "achievement") {
        s.fanfare.triggerAttackRelease(["C4", "E4", "G4"], "8n", now);
        s.fanfare.triggerAttackRelease(["E4", "G4", "C5"], "8n", now + 0.18);
      } else if (type === "levelup") {
        s.chord.triggerAttackRelease(["C4", "G4", "C5", "E5"], "4n", now);
      }
    } catch {
      /* audio may be blocked until a user gesture; safe to ignore */
    }
  }, [getSynths]);

  /* ---- load ---- */
  useEffect(() => {
    (async () => {
      const raw = await safeGet(STORAGE_KEY);
      const defaults = makeDefaultData();
      let initial;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          initial = { ...defaults, ...parsed, settings: { ...defaults.settings, ...(parsed.settings || {}) } };
        } catch {
          initial = defaults;
        }
      } else {
        initial = defaults;
      }
      const { data: rolled } = rollForward(initial);
      setData(rolled);
      setLoaded(true);
    })();
  }, []);

  /* ---- persist ---- */
  useEffect(() => {
    if (!loaded || !data) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
    }
    const t = setTimeout(() => {
      safeSet(STORAGE_KEY, JSON.stringify(data));
    }, 400);
    return () => clearTimeout(t);
  }, [data, loaded]);

  /* ---- midnight rollover check while app is open ---- */
  useEffect(() => {
    const iv = setInterval(() => {
      setData((d) => {
        if (!d) return d;
        if (d.lastActiveDate === todayKey()) return d;
        const { data: rolled } = rollForward(d);
        return rolled;
      });
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  /* ---- in-tab reminder notifications (best-effort; only fire while this
     tab is open, since a browser artifact can't register background push) ---- */
  useEffect(() => {
    const iv = setInterval(() => {
      setData((d) => {
        if (!d || !d.settings.notificationsEnabled) return d;
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return d;
        const now = new Date();
        const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
        const due = (d.settings.reminderTimes || []).find((t) => t === hhmm);
        if (!due || (d.notifiedSlotsToday || []).includes(due)) return d;
        try {
          new Notification("Daily Quest Reminder", { body: "Your Hunter quest is waiting — don't break the streak!" });
        } catch { /* notifications may be blocked */ }
        return { ...d, notifiedSlotsToday: [...(d.notifiedSlotsToday || []), due] };
      });
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { soundEnabledRef.current = data?.settings?.soundEffects ?? true; }, [data?.settings?.soundEffects]);

  const addToast = useCallback((text, type = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  /* ---- derived values ---- */
  const rawDaysSinceStart = data ? daysBetween(data.startDate, todayKey()) : 0;
  const daysSinceStart = data ? effectiveDays(data.startDate, data.restDates, todayKey()) : 0;
  const isRestToday = data ? (data.restDates || []).includes(todayKey()) : false;
  const todayExercises = useMemo(() => (data ? data.exercises.filter((e) => e.enabled) : []), [data]);
  const levelInfo = data ? levelFromXP(data.xp) : levelFromXP(0);
  const rank = data ? getRank(data.xp) : RANKS[0];
  const nRank = data ? nextRank(data.xp) : null;

  const todayTotals = useMemo(() => {
    if (!data) return { completed: 0, total: 0, pct: 0, remaining: 0, totalReps: 0 };
    let completed = 0, totalReps = 0;
    todayExercises.forEach((e) => {
      const target = computeTarget(e, daysSinceStart);
      totalReps += e.completedToday || 0;
      if (target > 0 && (e.completedToday || 0) >= target) completed++;
    });
    const total = todayExercises.length;
    return { completed, total, pct: total ? Math.round((completed / total) * 100) : 0, remaining: total - completed, totalReps };
  }, [data, todayExercises, daysSinceStart]);

  const todayStatus = isRestToday ? "rest" : todayTotals.total === 0 ? null : todayTotals.pct === 100 ? "complete" : todayTotals.totalReps > 0 ? "partial" : "missed";
  const streakInfo = useMemo(() => (data ? computeStreakInfo(data, todayStatus) : { current: 0, longest: 0 }), [data, todayStatus]);

  /* ---- stats for achievements / stats tab ---- */
  const stats = useMemo(() => {
    if (!data) return null;
    const totalReps = data.exercises.reduce((s, e) => s + (e.totalCompleted || 0), 0);
    const pushup = data.exercises.find((e) => e.name.toLowerCase().includes("push"));
    const pushupTotal = pushup ? pushup.totalCompleted || 0 : 0;
    const histVals = Object.entries(data.history);
    const completeDays = histVals.filter(([, h]) => h.status === "complete").length;
    const totalDays = histVals.length;
    const completionRate = totalDays ? Math.round((completeDays / totalDays) * 100) : 0;
    // perfect month check
    const byMonth = {};
    histVals.forEach(([k, h]) => {
      const mk = k.slice(0, 7);
      byMonth[mk] = byMonth[mk] || [];
      byMonth[mk].push(h.status);
    });
    let perfectMonth = false;
    const todayD = new Date();
    Object.entries(byMonth).forEach(([mk, arr]) => {
      const [y, m] = mk.split("-").map(Number);
      const isCurrentMonth = y === todayD.getFullYear() && m === todayD.getMonth() + 1;
      const expectedDays = isCurrentMonth ? todayD.getDate() - 1 : new Date(y, m, 0).getDate();
      if (expectedDays > 0 && arr.length >= expectedDays && arr.every((s) => s === "complete")) perfectMonth = true;
    });
    const favorite = [...data.exercises].sort((a, b) => (b.timesAwarded || 0) - (a.timesAwarded || 0))[0];
    const timeSpentMin = data.exercises.reduce((s, e) => {
      if (e.unit === "seconds") return s + (e.totalCompleted || 0) / 60;
      if (e.unit === "minutes") return s + (e.totalCompleted || 0);
      if (e.unit === "km") return s + (e.totalCompleted || 0) * 6;
      if (e.unit === "meters") return s + ((e.totalCompleted || 0) / 1000) * 6;
      return s + (e.totalCompleted || 0) * 0.03;
    }, 0);
    const li = levelFromXP(data.xp);
    const rk = getRank(data.xp);
    const highestTarget = data.exercises.reduce((s, e) => Math.max(s, computeTarget(e, daysSinceStart)), 0);
    return {
      totalReps, pushupTotal, completeDays, totalDays, completionRate, perfectMonth,
      favorite, timeSpentMin, level: li.level, xp: data.xp, rank: rk, streak: streakInfo.current,
      longestStreak: streakInfo.longest, highestTarget, totalWorkouts: totalDays,
    };
  }, [data, daysSinceStart, streakInfo]);

  /* ---- achievement unlock watcher ---- */
  useEffect(() => {
    if (!data || !stats) return;
    const newly = ACHIEVEMENT_DEFS.filter((a) => !data.achievementsUnlocked.includes(a.id) && a.check(stats));
    if (newly.length) {
      setData((d) => ({ ...d, achievementsUnlocked: [...d.achievementsUnlocked, ...newly.map((a) => a.id)] }));
      newly.forEach((a) => { addToast(`Achievement unlocked: ${a.name}`, "achievement"); playSound("achievement"); });
    }
    // eslint-disable-next-line
  }, [stats?.totalReps, stats?.streak, stats?.level, stats?.completeDays, stats?.perfectMonth, stats?.rank?.name, stats?.xp, stats?.totalWorkouts, stats?.highestTarget]);

  /* ---- level-up watcher ---- */
  useEffect(() => {
    if (!levelInfo) return;
    if (prevLevelRef.current !== null && levelInfo.level > prevLevelRef.current) {
      addToast(`LEVEL UP! You are now Level ${levelInfo.level}`, "quest");
      playSound("levelup");
    }
    prevLevelRef.current = levelInfo.level;
  }, [levelInfo?.level]);

  /* ---- quest complete overlay watcher ---- */
  useEffect(() => {
    const allDone = todayTotals.total > 0 && todayTotals.completed === todayTotals.total;
    if (allDone && !wasAllCompleteRef.current) {
      setQuestCompletePulse(true);
      setTimeout(() => setQuestCompletePulse(false), 2200);
    }
    wasAllCompleteRef.current = allDone;
  }, [todayTotals.completed, todayTotals.total]);

  /* ---- core mutation: set an exercise's completed value ---- */
  const setCompletedValue = useCallback((id, rawValue) => {
    setData((d) => {
      if (!d) return d;
      const dss = effectiveDays(d.startDate, d.restDates, todayKey());
      let bonusGain = 0;
      let bonusAwardedNow = false;
      let awardedName = null;
      const exercises = d.exercises.map((e) => {
        if (e.id !== id) return e;
        const target = computeTarget(e, dss);
        const value = clamp(rawValue, 0, Math.max(target * 2, target + 10));
        let awarded = e.awarded;
        let xpAwardedToday = e.xpAwardedToday || 0;
        let totalCompleted = e.totalCompleted || 0;
        let timesAwarded = e.timesAwarded || 0;
        const wasComplete = target > 0 && (e.completedToday || 0) >= target;
        const isComplete = target > 0 && value >= target;
        if (isComplete && !awarded) {
          const gain = Math.round((CATEGORY_META[e.category]?.xp || 25) * (d.settings.xpMultiplier || 1));
          xpAwardedToday += gain;
          awarded = true;
          timesAwarded += 1;
          awardedName = e.name;
        }
        const delta = value - (e.completedToday || 0);
        if (delta > 0) totalCompleted += delta;
        return { ...e, completedToday: value, awarded, xpAwardedToday, totalCompleted, timesAwarded };
      });
      const enabled = exercises.filter((e) => e.enabled);
      const allComplete = enabled.length > 0 && enabled.every((e) => {
        const t = computeTarget(e, dss);
        return t > 0 && (e.completedToday || 0) >= t;
      });
      let xp = d.xp;
      let bonusXPToday = d.bonusXPToday || 0;
      let questBonusAwardedToday = d.questBonusAwardedToday;
      const xpGainedThisCall = exercises.reduce((s, e, i) => s + ((e.xpAwardedToday || 0) - (d.exercises[i].xpAwardedToday || 0)), 0);
      xp += xpGainedThisCall;
      if (allComplete && !questBonusAwardedToday) {
        const bonus = Math.round(100 * (d.settings.xpMultiplier || 1));
        xp += bonus;
        bonusXPToday += bonus;
        questBonusAwardedToday = true;
        bonusAwardedNow = true;
      }
      if (awardedName) { addToast(`+XP: ${awardedName} complete!`, "xp"); playSound("complete"); }
      if (bonusAwardedNow) { addToast("Daily Quest Complete! Bonus XP awarded.", "quest"); playSound("quest"); }
      return { ...d, exercises, xp, bonusXPToday, questBonusAwardedToday };
    });
  }, [addToast, playSound]);

  const adjustCompleted = (ex) => (delta) => {
    const step = UNIT_STEP[ex.unit] ?? 1;
    setCompletedValue(ex.id, (ex.completedToday || 0) + delta * step);
  };
  const markComplete = (ex) => {
    const target = computeTarget(ex, daysSinceStart);
    setCompletedValue(ex.id, target);
  };

  /* ---- exercise CRUD ---- */
  const upsertExercise = (payload) => {
    setData((d) => {
      const exists = d.exercises.some((e) => e.id === payload.id);
      const exercises = exists
        ? d.exercises.map((e) => (e.id === payload.id ? { ...e, ...payload } : e))
        : [...d.exercises, makeExercise(payload)];
      return { ...d, exercises };
    });
  };
  const deleteExercise = (id) => {
    if (!window.confirm("Delete this exercise? This cannot be undone.")) return;
    setData((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }));
  };
  const duplicateExercise = (ex) => {
    setData((d) => ({
      ...d,
      exercises: [...d.exercises, makeExercise({ ...ex, id: uid(), name: ex.name + " (copy)", completedToday: 0, totalCompleted: 0, timesAwarded: 0, awarded: false, xpAwardedToday: 0 })],
    }));
  };
  const toggleEnabled = (id) => {
    setData((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)) }));
  };
  const toggleFavorite = (id) => {
    setData((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e)) }));
  };
  const moveExercise = (id, dir) => {
    setData((d) => {
      const arr = [...d.exercises];
      const idx = arr.findIndex((e) => e.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= arr.length) return d;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return { ...d, exercises: arr };
    });
  };

  /* ---- rest days & recovery ---- */
  const toggleRestDay = (dateStr) => {
    setData((d) => {
      const set = new Set(d.restDates || []);
      if (set.has(dateStr)) set.delete(dateStr);
      else set.add(dateStr);
      return { ...d, restDates: [...set] };
    });
  };
  const recoverDay = (dateStr) => {
    setData((d) => {
      const h = d.history[dateStr];
      if (!h || h.status !== "missed" || h.recovered || (d.recoveryTokensAvailable || 0) <= 0) return d;
      addToast(`${dateStr} recovered — streak restored!`, "quest");
      return { ...d, recoveryTokensAvailable: d.recoveryTokensAvailable - 1, history: { ...d.history, [dateStr]: { ...h, recovered: true } } };
    });
  };

  /* ---- templates ---- */
  const applyTemplate = (exerciseDefs, mode) => {
    setData((d) => {
      const fresh = exerciseDefs.map((e) => makeExercise(e));
      return { ...d, exercises: mode === "replace" ? fresh : [...d.exercises, ...fresh] };
    });
    addToast(mode === "replace" ? "Template applied — exercise list replaced." : "Template exercises added.", "info");
    setTemplatesOpen(false);
  };
  const saveCustomTemplate = (name) => {
    if (!name.trim()) return;
    setData((d) => ({
      ...d,
      customTemplates: [...d.customTemplates, {
        id: uid(), name: name.trim(),
        exercises: d.exercises.map(({ name, emoji, category, unit, start, increment, min, max, notes }) => ({ name, emoji, category, unit, start, increment, min, max, notes })),
      }],
    }));
    addToast("Saved current list as a template.", "info");
  };
  const deleteCustomTemplate = (id) => setData((d) => ({ ...d, customTemplates: d.customTemplates.filter((t) => t.id !== id) }));

  /* ---- settings ---- */
  const updateSettings = (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const resetAllData = () => {
    if (!window.confirm("Reset ALL progress, exercises and stats? This cannot be undone.")) return;
    setData(makeDefaultData());
    addToast("All data has been reset.", "info");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hunter-log-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast("Backup exported.", "info");
  };
  const exportCSV = () => {
    const rows = Object.entries(data.history).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, h]) => ({
      date, status: h.recovered ? "recovered" : h.status, exercisesCompleted: h.completedCount,
      totalExercises: h.totalCount, totalReps: h.totalReps, xpEarned: h.xpEarned,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hunter-log-${todayKey()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast("History exported as CSV.", "info");
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.exercises) || typeof parsed.xp !== "number") throw new Error("bad shape");
        const { data: rolled } = rollForward(parsed);
        setData(rolled);
        addToast("Backup restored.", "info");
      } catch {
        addToast("Import failed: invalid file.", "danger");
      }
    };
    reader.readAsText(file);
  };

  const quote = QUOTES[Math.abs(daysSinceStart) % QUOTES.length];

  if (!loaded || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#05050a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle accent="#a855f7" theme="dark" />
        <div className="loader-ring" />
      </div>
    );
  }

  const isLight = data.settings.theme === "light";

  return (
    <div className={`sl-root ${isLight ? "theme-light" : "theme-dark"}`} style={{ "--accent": data.settings.accent }}>
      <GlobalStyle accent={data.settings.accent} theme={data.settings.theme} />
      <Particles enabled={data.settings.animations} />

      {questCompletePulse && <QuestCompleteOverlay />}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "achievement" && <Award size={16} />}
            {t.type === "quest" && <Trophy size={16} />}
            {t.type === "xp" && <Sparkles size={16} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      <StatusHeader data={data} levelInfo={levelInfo} rank={rank} nRank={nRank} isLight={isLight} streak={streakInfo.current}
        onToggleTheme={() => updateSettings({ theme: isLight ? "dark" : "light" })} />

      <main className="sl-main">
        {tab === "dashboard" && (
          <DashboardTab
            data={data} daysSinceStart={daysSinceStart} todayExercises={todayExercises}
            todayTotals={todayTotals} quote={quote} adjustCompleted={adjustCompleted}
            markComplete={markComplete} setTab={setTab}
          />
        )}
        {tab === "quests" && (
          <QuestsTab
            data={data} daysSinceStart={daysSinceStart} adjustCompleted={adjustCompleted}
            markComplete={markComplete} onAdd={() => setModalExercise({ mode: "add" })}
            onEdit={(ex) => setModalExercise({ mode: "edit", data: ex })}
            onDelete={deleteExercise} onDuplicate={duplicateExercise}
            onToggleEnabled={toggleEnabled} onToggleFavorite={toggleFavorite} onMove={moveExercise}
          />
        )}
        {tab === "stats" && <StatsTab data={data} stats={stats} daysSinceStart={daysSinceStart} />}
        {tab === "calendar" && (
          <CalendarTab data={data} calMonth={calMonth} calYear={calYear} setCalMonth={setCalMonth}
            setCalYear={setCalYear} selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
        )}
        {tab === "achievements" && <AchievementsTab data={data} stats={stats} />}
        {tab === "settings" && (
          <SettingsTab
            data={data} updateSettings={updateSettings} onExport={exportData}
            onImportClick={() => fileInputRef.current?.click()} onReset={resetAllData}
          />
        )}
      </main>

      <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.[0]) importData(e.target.files[0]); e.target.value = ""; }} />

      <NavBar tab={tab} setTab={setTab} />

      {modalExercise && (
        <ExerciseModal
          mode={modalExercise.mode} initial={modalExercise.data} defaults={data.settings}
          onClose={() => setModalExercise(null)}
          onSave={(payload) => { upsertExercise(payload); setModalExercise(null); }}
        />
      )}
    </div>
  );
}

/* ============================ GLOBAL STYLE =============================== */

function GlobalStyle({ accent, theme }) {
  return (
    <style>{`
      * { box-sizing: border-box; }
      .sl-root {
        min-height: 100vh;
        font-family: 'Segoe UI', ui-sans-serif, system-ui, sans-serif;
        position: relative;
        overflow-x: hidden;
        padding-bottom: 84px;
        transition: background .4s ease, color .4s ease;
      }
      .theme-dark { background: radial-gradient(ellipse at top, #0d0a1a 0%, #05050a 55%, #020204 100%); color: #e9e7f5; }
      .theme-light { background: radial-gradient(ellipse at top, #f3f0ff 0%, #eceaf7 60%, #e4e2f5 100%); color: #1c1830; }

      .loader-ring {
        width: 56px; height: 56px; border-radius: 999px;
        border: 3px solid rgba(168,85,247,0.15); border-top-color: #a855f7;
        animation: spin 0.9s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .glass {
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(168,85,247,0.22);
        backdrop-filter: blur(14px);
        border-radius: 18px;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.02) inset, 0 8px 30px rgba(0,0,0,0.35);
      }
      .theme-light .glass {
        background: rgba(255,255,255,0.65);
        border: 1px solid rgba(120,80,220,0.18);
        box-shadow: 0 8px 24px rgba(90,60,180,0.08);
      }

      .neon-text { color: var(--accent); text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 70%, transparent), 0 0 28px color-mix(in srgb, var(--accent) 35%, transparent); }
      .neon-border { border-color: color-mix(in srgb, var(--accent) 55%, transparent) !important; }
      .glow-btn {
        background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 85%, #000), color-mix(in srgb, var(--accent) 55%, #1a1030));
        color: #fff; border: 1px solid color-mix(in srgb, var(--accent) 70%, transparent);
        box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 2px color-mix(in srgb, var(--accent) 80%, transparent) inset;
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
      }
      .glow-btn:hover { transform: translateY(-1px); filter: brightness(1.12); box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 65%, transparent); }
      .glow-btn:active { transform: translateY(0); }
      .glow-btn:disabled { opacity: .4; filter: grayscale(0.4); cursor: not-allowed; }

      .xp-bar-track { background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; position: relative; }
      .theme-light .xp-bar-track { background: rgba(90,60,180,0.1); }
      .xp-bar-fill {
        height: 100%; border-radius: 999px;
        background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 60%, #38bdf8), var(--accent));
        box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 70%, transparent);
        transition: width .6s cubic-bezier(.22,1,.36,1);
      }
      .anim-on .xp-bar-fill::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
        animation: shimmer 2.2s linear infinite;
      }
      @keyframes shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }

      .particle-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
      .particle {
        position: absolute; border-radius: 999px;
        background: radial-gradient(circle, color-mix(in srgb, var(--accent) 90%, #fff) 0%, transparent 70%);
        opacity: .55; animation: float linear infinite;
      }
      @keyframes float {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        10% { opacity: .6; }
        90% { opacity: .5; }
        100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
      }

      .sl-main { position: relative; z-index: 1; max-width: 880px; margin: 0 auto; padding: 16px 14px 24px; }

      .navbar {
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
        display: flex; justify-content: space-around; align-items: center;
        padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
        background: rgba(8,6,18,0.75); backdrop-filter: blur(16px);
        border-top: 1px solid rgba(168,85,247,0.2);
      }
      .theme-light .navbar { background: rgba(255,255,255,0.75); border-top: 1px solid rgba(120,80,220,0.18); }
      .nav-item {
        display: flex; flex-direction: column; align-items: center; gap: 2px;
        font-size: 10px; color: rgba(233,231,245,0.55); background: none; border: none; cursor: pointer;
        padding: 6px 10px; border-radius: 12px; transition: color .2s ease, background .2s ease;
      }
      .theme-light .nav-item { color: rgba(28,24,48,0.5); }
      .nav-item.active { color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }

      .toast-stack { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; flex-direction: column; gap: 8px; align-items: center; width: min(94vw, 420px); }
      .toast {
        display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 14px;
        font-size: 13px; font-weight: 600; color: #fff; backdrop-filter: blur(10px);
        animation: toast-in .35s cubic-bezier(.22,1,.36,1);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      @keyframes toast-in { from { opacity: 0; transform: translateY(-14px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .toast-info { background: rgba(56,60,90,0.85); border: 1px solid rgba(168,85,247,0.35); }
      .toast-xp { background: rgba(56,80,180,0.7); border: 1px solid rgba(59,130,246,0.5); }
      .toast-quest { background: linear-gradient(135deg, rgba(168,85,247,0.9), rgba(236,72,153,0.8)); border: 1px solid rgba(236,72,153,0.6); }
      .toast-achievement { background: linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,70,239,0.7)); border: 1px solid rgba(245,158,11,0.55); }
      .toast-danger { background: rgba(190,40,60,0.85); border: 1px solid rgba(239,68,68,0.5); }

      .quest-overlay {
        position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle, rgba(30,10,60,0.55), rgba(0,0,0,0.75));
        animation: overlay-fade 2.2s ease forwards; pointer-events: none;
      }
      @keyframes overlay-fade { 0% { opacity: 0; } 12% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
      .quest-overlay-text {
        font-size: clamp(28px, 8vw, 56px); font-weight: 800; letter-spacing: 4px;
        background: linear-gradient(135deg, #fff, var(--accent));
        -webkit-background-clip: text; background-clip: text; color: transparent;
        text-shadow: 0 0 40px color-mix(in srgb, var(--accent) 60%, transparent);
        animation: quest-pop .6s cubic-bezier(.22,1.4,.36,1);
      }
      @keyframes quest-pop { 0% { transform: scale(.5); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }

      .rank-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 46px; height: 46px; border-radius: 12px; font-weight: 800; font-size: 15px;
        border: 1.5px solid; position: relative; flex-shrink: 0;
        animation: badge-pulse 2.6s ease-in-out infinite;
      }
      @keyframes badge-pulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }

      .progress-track { background: rgba(255,255,255,0.06); border-radius: 999px; height: 8px; overflow: hidden; }
      .theme-light .progress-track { background: rgba(90,60,180,0.1); }
      .progress-fill { height: 100%; border-radius: 999px; transition: width .5s cubic-bezier(.22,1,.36,1); }

      .card-pop { animation: card-pop .35s cubic-bezier(.22,1,.36,1); }
      @keyframes card-pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

      .modal-backdrop { position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
      @media (min-width: 640px) { .modal-backdrop { align-items: center; } }
      .modal-sheet { width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; border-radius: 22px 22px 0 0; }
      @media (min-width: 640px) { .modal-sheet { border-radius: 22px; } }

      input, select, textarea {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(168,85,247,0.25); border-radius: 10px;
        color: inherit; padding: 8px 10px; font-size: 13px; outline: none; width: 100%;
      }
      .theme-light input, .theme-light select, .theme-light textarea { background: rgba(120,80,220,0.05); border-color: rgba(120,80,220,0.2); }
      input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); }
      label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; opacity: .6; display: block; margin-bottom: 4px; }

      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--accent) 40%, transparent); border-radius: 999px; }

      .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(168,85,247,0.2); border-radius: 10px; padding: 6px; display: flex; cursor: pointer; color: inherit; transition: all .15s ease; }
      .icon-btn:hover { background: color-mix(in srgb, var(--accent) 18%, transparent); }
      .theme-light .icon-btn { background: rgba(120,80,220,0.06); }

      @media (prefers-reduced-motion: reduce) {
        .particle, .xp-bar-fill::after, .rank-badge, .quest-overlay, .quest-overlay-text, .card-pop { animation: none !important; }
      }
    `}</style>
  );
}

/* ============================== PARTICLES ================================ */

function Particles({ enabled }) {
  const particles = useMemo(() => {
    return Array.from({ length: 26 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 10 + Math.random() * 14,
      delay: -Math.random() * 20,
    }));
  }, []);
  if (!enabled) return null;
  return (
    <div className="particle-layer">
      {particles.map((p) => (
        <div key={p.id} className="particle" style={{ left: `${p.left}%`, bottom: -20, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}

function QuestCompleteOverlay() {
  return (
    <div className="quest-overlay">
      <div className="quest-overlay-text">QUEST COMPLETE</div>
    </div>
  );
}

/* ============================ STATUS HEADER =============================== */

function StatusHeader({ data, levelInfo, rank, nRank, isLight, onToggleTheme, streak }) {
  const pct = Math.round(levelInfo.progress * 100);
  return (
    <header className="glass card-pop" style={{ margin: "12px 12px 8px", padding: "14px 16px", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="rank-badge neon-border" style={{ color: rank.color, borderColor: rank.color, boxShadow: `0 0 16px ${rank.color}55` }}>
          {rank.name === "Monarch" ? <Crown size={20} /> : rank.name === "National" ? <Swords size={18} /> : rank.name}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 4 }}>
            <div>
              <span className="neon-text" style={{ fontWeight: 800, fontSize: 15 }}>LEVEL {levelInfo.level}</span>
              <span style={{ opacity: 0.55, fontSize: 11, marginLeft: 8 }}>{rank.name}-Rank Hunter</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, opacity: 0.8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Flame size={13} color="#f97316" /> {streak}</span>
              <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
                {isLight ? <Moon size={14} /> : <Sun size={14} />}
              </button>
            </div>
          </div>
          <div className={`xp-bar-track ${data.settings.animations ? "anim-on" : ""}`} style={{ height: 10, marginTop: 6 }}>
            <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.55, marginTop: 3 }}>
            <span>{levelInfo.xpIntoLevel} / {levelInfo.xpForNext} XP</span>
            <span>{data.xp} total{nRank ? ` · ${nRank.min - data.xp} XP to ${nRank.name}` : " · MAX RANK"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/* =============================== NAV BAR =================================== */

function NavBar({ tab, setTab }) {
  const items = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "quests", label: "Quests", icon: Dumbbell },
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "achievements", label: "Awards", icon: Award },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <nav className="navbar">
      {items.map((it) => (
        <button key={it.id} className={`nav-item ${tab === it.id ? "active" : ""}`} onClick={() => setTab(it.id)}>
          <it.icon size={19} />
          {it.label}
        </button>
      ))}
    </nav>
  );
}

/* ============================== DASHBOARD ================================== */

function DashboardTab({ data, daysSinceStart, todayExercises, todayTotals, quote, adjustCompleted, markComplete, setTab }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="glass card-pop" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>Day {Math.max(daysSinceStart, 0) + 1} of your journey</div>
        </div>
        <div style={{ fontSize: 13, fontStyle: "italic", opacity: 0.85, borderLeft: "2px solid var(--accent)", paddingLeft: 10 }}>"{quote}"</div>
      </div>

      <div className="glass card-pop" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <ListChecks size={16} className="neon-text" /> Today's Quest
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: todayTotals.pct === 100 ? "#4ade80" : "var(--accent)" }}>
            {todayTotals.pct === 100 ? "COMPLETE" : "IN PROGRESS"}
          </span>
        </div>
        <div className="progress-track" style={{ height: 10, marginTop: 10 }}>
          <div className="progress-fill" style={{ width: `${todayTotals.pct}%`, background: "linear-gradient(90deg, var(--accent), #38bdf8)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12, textAlign: "center" }}>
          <MiniStat label="Done" value={`${todayTotals.completed}/${todayTotals.total}`} />
          <MiniStat label="Completion" value={`${todayTotals.pct}%`} />
          <MiniStat label="Remaining" value={todayTotals.remaining} />
        </div>
        <div style={{ fontSize: 10.5, opacity: 0.45, marginTop: 10, textAlign: "center" }}>
          Formula: Target = Start + (Days Since Start × Increment)
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {todayExercises.length === 0 && (
          <EmptyState text="No active exercises yet. Head to Quests to add your first one." />
        )}
        {todayExercises.map((ex) => (
          <ExerciseCard key={ex.id} ex={ex} daysSinceStart={daysSinceStart}
            onAdjust={adjustCompleted(ex)} onComplete={() => markComplete(ex)} compact />
        ))}
      </div>

      {todayExercises.length > 0 && (
        <button className="glow-btn" style={{ borderRadius: 14, padding: "10px 14px", fontWeight: 700, fontSize: 13 }} onClick={() => setTab("quests")}>
          Manage Exercises →
        </button>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.5, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="glass" style={{ padding: 24, textAlign: "center", opacity: 0.7, fontSize: 13 }}>
      <Info size={20} style={{ marginBottom: 6 }} />
      <div>{text}</div>
    </div>
  );
}

/* ============================= EXERCISE CARD ================================ */

function ExerciseCard({ ex, daysSinceStart, onAdjust, onComplete, compact, manageMode, onEdit, onDelete, onDuplicate, onToggleEnabled, onToggleFavorite, onMove }) {
  const target = computeTarget(ex, daysSinceStart);
  const completed = ex.completedToday || 0;
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const done = target > 0 && completed >= target;
  const meta = CATEGORY_META[ex.category] || CATEGORY_META.Custom;

  return (
    <div className="glass card-pop" style={{ padding: 14, opacity: ex.enabled ? 1 : 0.45 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div style={{ fontSize: 24, lineHeight: 1 }}>{ex.emoji}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              {ex.name}
              {ex.favorite && <Star size={12} fill="#facc15" color="#facc15" />}
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.55, display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: meta.color, fontWeight: 700 }}>{ex.category}</span>
              <span>· Target {fmtVal(target, ex.unit)} {ex.unit}</span>
            </div>
          </div>
        </div>
        {done && !manageMode && (
          <span style={{ fontSize: 10, fontWeight: 800, color: "#4ade80", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            <Check size={13} /> DONE
          </span>
        )}
      </div>

      {!manageMode && (
        <>
          <div className="progress-track" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: done ? "linear-gradient(90deg,#22c55e,#4ade80)" : `linear-gradient(90deg, ${meta.color}, var(--accent))` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{fmtVal(completed, ex.unit)} / {fmtVal(target, ex.unit)} {ex.unit}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="icon-btn" onClick={() => onAdjust(-1)} disabled={completed <= 0}><Minus size={14} /></button>
              <button className="icon-btn" onClick={() => onAdjust(1)} disabled={done}><Plus size={14} /></button>
              <button className="glow-btn" style={{ borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 700 }} onClick={onComplete} disabled={done}>
                {done ? "Complete" : "Mark Done"}
              </button>
            </div>
          </div>
          {ex.notes && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8, fontStyle: "italic" }}>{ex.notes}</div>}
        </>
      )}

      {manageMode && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 10.5, opacity: 0.6 }}>
            Start {fmtVal(ex.start, ex.unit)} · +{ex.increment}/day{ex.max ? ` · Cap ${ex.max}` : ""}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="icon-btn" title="Move up" onClick={() => onMove(ex.id, -1)}><ChevronUp size={14} /></button>
            <button className="icon-btn" title="Move down" onClick={() => onMove(ex.id, 1)}><ChevronDown size={14} /></button>
            <button className="icon-btn" title="Favorite" onClick={() => onToggleFavorite(ex.id)}><Star size={14} fill={ex.favorite ? "#facc15" : "none"} color={ex.favorite ? "#facc15" : "currentColor"} /></button>
            <button className="icon-btn" title={ex.enabled ? "Disable" : "Enable"} onClick={() => onToggleEnabled(ex.id)}>
              {ex.enabled ? <Check size={14} /> : <X size={14} />}
            </button>
            <button className="icon-btn" title="Duplicate" onClick={() => onDuplicate(ex)}><Copy size={14} /></button>
            <button className="icon-btn" title="Edit" onClick={() => onEdit(ex)}><Pencil size={14} /></button>
            <button className="icon-btn" title="Delete" onClick={() => onDelete(ex.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================ QUESTS TAB ================================= */

function QuestsTab({ data, daysSinceStart, adjustCompleted, markComplete, onAdd, onEdit, onDelete, onDuplicate, onToggleEnabled, onToggleFavorite, onMove }) {
  const [manage, setManage] = useState(false);
  const [filter, setFilter] = useState("All");
  const filtered = data.exercises.filter((e) => filter === "All" || e.category === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className="icon-btn" style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", borderRadius: 999, padding: "6px 12px", background: filter === c ? "color-mix(in srgb, var(--accent) 25%, transparent)" : undefined, borderColor: filter === c ? "var(--accent)" : undefined }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="icon-btn" style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px" }} onClick={() => setManage((m) => !m)}>
            {manage ? "Done" : "Manage"}
          </button>
          <button className="glow-btn" style={{ borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }} onClick={onAdd}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {filtered.length === 0 && <EmptyState text="No exercises in this category yet." />}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((ex) => (
          <ExerciseCard key={ex.id} ex={ex} daysSinceStart={daysSinceStart}
            onAdjust={adjustCompleted(ex)} onComplete={() => markComplete(ex)}
            manageMode={manage} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate}
            onToggleEnabled={onToggleEnabled} onToggleFavorite={onToggleFavorite} onMove={onMove}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================== EXERCISE MODAL =============================== */

function ExerciseModal({ mode, initial, defaults, onClose, onSave }) {
  const [form, setForm] = useState(() => initial ? { ...initial } : makeExercise({ start: defaults.defaultStart, increment: defaults.defaultIncrement }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      start: Number(form.start) || 0,
      increment: Number(form.increment) || 0,
      min: form.min === "" || form.min === null ? 0 : Number(form.min),
      max: form.max === "" || form.max === null ? null : Number(form.max),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="glass modal-sheet card-pop" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{mode === "add" ? "New Exercise" : "Edit Exercise"}</div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 10, marginBottom: 10 }}>
          <div><label>Icon</label><input value={form.emoji} maxLength={2} onChange={(e) => set("emoji", e.target.value)} /></div>
          <div><label>Name</label><input value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label>Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Unit</label>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label>Starting amount</label><input type="number" step="any" value={form.start} onChange={(e) => set("start", e.target.value)} /></div>
          <div><label>Daily increment</label><input type="number" step="any" value={form.increment} onChange={(e) => set("increment", e.target.value)} /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label>Minimum</label><input type="number" step="any" value={form.min ?? 0} onChange={(e) => set("min", e.target.value)} /></div>
          <div><label>Maximum (optional)</label><input type="number" step="any" value={form.max ?? ""} placeholder="No cap" onChange={(e) => set("max", e.target.value)} /></div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label>Notes (optional)</label>
          <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <button type="submit" className="glow-btn" style={{ width: "100%", borderRadius: 12, padding: "10px 14px", fontWeight: 700, fontSize: 14 }}>
          {mode === "add" ? "Add Exercise" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

/* ================================= STATS TAB ================================= */

function StatsTab({ data, stats, daysSinceStart }) {
  const historyEntries = useMemo(() => Object.entries(data.history).sort(([a], [b]) => (a < b ? -1 : 1)), [data.history]);

  const xpChartData = useMemo(() => {
    let cum = 0;
    return historyEntries.map(([date, h]) => {
      cum += h.xpEarned || 0;
      return { date: date.slice(5), xp: cum };
    });
  }, [historyEntries]);

  const weekData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const isToday = key === todayKey();
      let reps;
      if (isToday) {
        reps = data.exercises.filter((e) => e.enabled).reduce((s, e) => s + (e.completedToday || 0), 0);
      } else {
        reps = data.history[key]?.totalReps || 0;
      }
      days.push({ date: key.slice(5), reps });
    }
    return days;
  }, [data, daysSinceStart]);

  const categoryData = useMemo(() => {
    const byCat = {};
    data.exercises.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (e.totalCompleted || 0); });
    return Object.entries(byCat).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, color: CATEGORY_META[name]?.color || "#a855f7" }));
  }, [data.exercises]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="glass card-pop" style={{ padding: 16 }}>
        <SectionTitle icon={BarChart3} text="XP Growth" />
        {xpChartData.length < 2 ? <EmptyState text="Complete a few days of quests to see your XP growth chart." /> : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={xpChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <Tooltip contentStyle={{ background: "#14101f", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="xp" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass card-pop" style={{ padding: 16 }}>
        <SectionTitle icon={Target} text="Last 7 Days — Total Reps" />
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
            <Tooltip contentStyle={{ background: "#14101f", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="reps" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {categoryData.length > 0 && (
        <div className="glass card-pop" style={{ padding: 16 }}>
          <SectionTitle icon={Dumbbell} text="Volume by Category" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {categoryData.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#14101f", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass card-pop" style={{ padding: 16 }}>
        <SectionTitle icon={Trophy} text="Statistics" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          <StatRow label="Total Workouts" value={stats.totalWorkouts} />
          <StatRow label="Total Repetitions" value={Math.round(stats.totalReps)} />
          <StatRow label="Avg Daily Reps" value={stats.totalDays ? Math.round(stats.totalReps / stats.totalDays) : 0} />
          <StatRow label="Current Target Sum" value={data.exercises.filter(e=>e.enabled).reduce((s,e)=>s+computeTarget(e,daysSinceStart),0)} />
          <StatRow label="Highest Target" value={Math.round(stats.highestTarget)} />
          <StatRow label="Current Streak" value={stats.streak} />
          <StatRow label="Longest Streak" value={stats.longestStreak} />
          <StatRow label="Completion Rate" value={`${stats.completionRate}%`} />
          <StatRow label="Total XP" value={stats.xp} />
          <StatRow label="Current Rank" value={stats.rank.name} />
          <StatRow label="Time Spent (est.)" value={`${Math.round(stats.timeSpentMin)} min`} />
          <StatRow label="Favorite Exercise" value={stats.favorite ? `${stats.favorite.emoji} ${stats.favorite.name}` : "—"} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, text }) {
  return <div style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><Icon size={15} className="neon-text" /> {text}</div>;
}
function StatRow({ label, value }) {
  return (
    <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

/* ================================ CALENDAR TAB ================================ */

function CalendarTab({ data, calMonth, calYear, setCalMonth, setCalYear, selectedDay, setSelectedDay }) {
  const first = new Date(calYear, calMonth, 1);
  const startWeekday = first.getDay();
  const numDays = new Date(calYear, calMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  const changeMonth = (delta) => {
    let m = calMonth + delta, y = calYear;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
    setSelectedDay(null);
  };

  const statusColor = { complete: "#22c55e", partial: "#eab308", missed: "#ef4444" };
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayStr = todayKey();
  const selected = selectedDay ? data.history[selectedDay] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="glass card-pop" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button className="icon-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{monthLabel}</div>
          <button className="icon-btn" onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, fontSize: 10, opacity: 0.5, marginBottom: 4, textAlign: "center" }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const key = dateKeyFor(calYear, calMonth, day);
            const h = data.history[key];
            const isToday = key === todayStr;
            const isFuture = key > todayStr;
            return (
              <button key={i} onClick={() => !isFuture && setSelectedDay(key)}
                className="icon-btn"
                style={{
                  aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: isToday ? 800 : 500, cursor: isFuture ? "default" : "pointer",
                  borderColor: selectedDay === key ? "var(--accent)" : (h ? statusColor[h.status] + "55" : undefined),
                  background: h ? statusColor[h.status] + "22" : undefined,
                  color: isFuture ? "rgba(233,231,245,0.25)" : undefined,
                  boxShadow: isToday ? "0 0 0 1.5px var(--accent) inset" : undefined,
                }}>
                {day}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 10.5, opacity: 0.7 }}>
          <LegendDot color="#22c55e" label="Complete" />
          <LegendDot color="#eab308" label="Partial" />
          <LegendDot color="#ef4444" label="Missed" />
        </div>
      </div>

      {selectedDay && (
        <div className="glass card-pop" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{new Date(selectedDay + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          {selected ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <StatRow label="Exercises Done" value={`${selected.completedCount}/${selected.totalCount}`} />
              <StatRow label="Total Reps" value={selected.totalReps} />
              <StatRow label="XP Earned" value={selected.xpEarned} />
              <StatRow label="Status" value={selected.status} />
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.55 }}>No data recorded for this day.</div>
          )}
        </div>
      )}
    </div>
  );
}
function LegendDot({ color, label }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 999, background: color }} /> {label}</div>;
}

/* ============================== ACHIEVEMENTS TAB =============================== */

function AchievementsTab({ data, stats }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.6, padding: "0 2px" }}>
        {data.achievementsUnlocked.length} / {ACHIEVEMENT_DEFS.length} unlocked
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ACHIEVEMENT_DEFS.map((a) => {
          const unlocked = data.achievementsUnlocked.includes(a.id);
          const Icon = a.icon;
          return (
            <div key={a.id} className="glass card-pop" style={{
              padding: 14, textAlign: "center", opacity: unlocked ? 1 : 0.4,
              borderColor: unlocked ? "var(--accent)" : undefined,
              boxShadow: unlocked ? "0 0 16px color-mix(in srgb, var(--accent) 30%, transparent)" : undefined,
            }}>
              <Icon size={26} className={unlocked ? "neon-text" : ""} style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>{a.name}</div>
              <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 3 }}>{a.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================ SETTINGS TAB ================================= */

function SettingsTab({ data, updateSettings, onExport, onImportClick, onReset }) {
  const s = data.settings;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="glass card-pop" style={{ padding: 16 }}>
        <SectionTitle icon={SettingsIcon} text="Appearance" />
        <div style={{ marginTop: 8 }}>
          <label>Accent Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ACCENTS.map((a) => (
              <button key={a.value} onClick={() => updateSettings({ accent: a.value })}
                title={a.name}
                style={{
                  width: 32, height: 32, borderRadius: 999, background: a.value, cursor: "pointer",
                  border: s.accent === a.value ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)",
                  boxShadow: `0 0 10px ${a.value}88`,
                }} />
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ marginBottom: 0 }}>Dark / Light Theme</label>
          <button className="icon-btn" onClick={() => updateSettings({ theme: s.theme === "light" ? "dark" : "light" })}>
            {s.theme === "light" ? <Sun size={14} /> : <Moon size={14} />} {s.theme}
          </button>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ marginBottom: 0 }}>Animations</label>
          <Toggle checked={s.animations} onChange={(v) => updateSettings({ animations: v })} />
        </div>
      </div>

      <div className="glass card-pop" style={{ padding: 16 }}>
        <SectionTitle icon={Target} text="Defaults for New Exercises" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          <div><label>Default Start</label><input type="number" value={s.defaultStart} onChange={(e) => updateSettings({ defaultStart: Number(e.target.value) })} /></div>
          <div><label>Default Increment</label><input type="number" value={s.defaultIncrement} onChange={(e) => updateSettings({ defaultIncrement: Number(e.target.value) })} /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label>XP Multiplier ({s.xpMultiplier}×)</label>
          <input type="range" min="0.5" max="3" step="0.1" value={s.xpMultiplier} onChange={(e) => updateSettings({ xpMultiplier: Number(e.target.value) })} />
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ marginBottom: 0 }}>Sound Effects</label>
          <Toggle checked={s.soundEffects} onChange={(v) => updateSettings({ soundEffects: v })} />
        </div>
      </div>

      <div className="glass card-pop" style={{ padding: 16 }}>
        <SectionTitle icon={Download} text="Backup & Restore" />
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button className="glow-btn" style={{ borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }} onClick={onExport}>
            <Download size={14} /> Export JSON
          </button>
          <button className="icon-btn" style={{ borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }} onClick={onImportClick}>
            <Upload size={14} /> Import JSON
          </button>
        </div>
        <div style={{ fontSize: 10.5, opacity: 0.45, marginTop: 8 }}>Progress auto-saves as you go. Export a backup any time.</div>
      </div>

      <div className="glass card-pop" style={{ padding: 16, borderColor: "rgba(239,68,68,0.4)" }}>
        <SectionTitle icon={RotateCcw} text="Danger Zone" />
        <button className="icon-btn" style={{ borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, color: "#f87171", borderColor: "rgba(239,68,68,0.4)", marginTop: 8 }} onClick={onReset}>
          Reset All Data
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="icon-btn"
      style={{ width: 40, height: 22, borderRadius: 999, padding: 2, background: checked ? "var(--accent)" : "rgba(255,255,255,0.08)", display: "flex", justifyContent: checked ? "flex-end" : "flex-start" }}>
      <div style={{ width: 16, height: 16, borderRadius: 999, background: "#fff" }} />
    </button>
  );
}
