"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import {
  saveCourt,
  deleteCourt,
  saveCourts,
  updateWeeklySchedule,
} from "@/services/businessService";
import { ALL_SPORTS_CATEGORIES } from "@/components/owner/BusinessProfileForm";
import { formatINR } from "@/lib/format";
import type {
  VenueCourt,
  CourtStatus,
  WeeklySchedule,
  DaySchedule,
} from "@/types";
import {
  Grid3X3,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  IndianRupee,
  Activity,
  ArrowLeft,
  Loader2,
  X,
  AlertTriangle,
  Save,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

export default function OwnerCourtsPage() {
  const { businessProfile, refreshBusinessProfile, loading } = useAuth();

  // Courts state
  const [courts, setCourts] = useState<VenueCourt[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<VenueCourt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<VenueCourt | null>(null);

  // Form inputs for modal
  const [courtName, setCourtName] = useState("");
  const [sportId, setSportId] = useState("cricket");
  const [pricePerHour, setPricePerHour] = useState<number | string>(800);
  const [courtStatus, setCourtStatus] = useState<CourtStatus>("active");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<30 | 60>(60);
  const [description, setDescription] = useState("");

  // Feedback states
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Operating Schedule State
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // Sync courts and schedule from business profile
  useEffect(() => {
    if (businessProfile) {
      if (Array.isArray(businessProfile.courts)) {
        setCourts(businessProfile.courts);
      }
      if (businessProfile.businessHours?.weeklySchedule) {
        setSchedule(businessProfile.businessHours.weeklySchedule);
      } else {
        const start = businessProfile.businessHours?.startTime || "08:00";
        const end = businessProfile.businessHours?.endTime || "22:00";
        const standardDay = { isOpen: true, openTime: start, closeTime: end };
        setSchedule({
          monday: { ...standardDay },
          tuesday: { ...standardDay },
          wednesday: { ...standardDay },
          thursday: { ...standardDay },
          friday: { ...standardDay },
          saturday: { ...standardDay },
          sunday: { ...standardDay },
        });
      }
    }
  }, [businessProfile]);

  // Allowed sports based on business categories, with fallback to all sports
  const availableSports = useMemo(() => {
    const hostedIds = businessProfile?.categories || [];
    if (hostedIds.length > 0) {
      const filtered = ALL_SPORTS_CATEGORIES.filter((s) => hostedIds.includes(s.id));
      return filtered.length > 0 ? filtered : ALL_SPORTS_CATEGORIES;
    }
    return ALL_SPORTS_CATEGORIES;
  }, [businessProfile?.categories]);

  // Statistics
  const activeCourtsCount = useMemo(
    () => courts.filter((c) => c.status === "active" || (c.active !== false && !c.status)).length,
    [courts]
  );

  const maintenanceCourtsCount = useMemo(
    () => courts.filter((c) => c.status === "maintenance").length,
    [courts]
  );

  const avgPricePerHour = useMemo(() => {
    if (courts.length === 0) return 0;
    const total = courts.reduce((sum, c) => sum + (Number(c.pricePerHour) || 0), 0);
    return Math.round(total / courts.length);
  }, [courts]);

  // Open modal for Adding
  const handleOpenAdd = () => {
    setSelectedCourt(null);
    setCourtName("");
    setSportId(availableSports[0]?.id || "cricket");
    setPricePerHour(800);
    setCourtStatus("active");
    setSlotDurationMinutes(businessProfile?.slotDurationMinutes || 60);
    setDescription("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEdit = (court: VenueCourt) => {
    setSelectedCourt(court);
    setCourtName(court.name);
    setSportId(court.sportId);
    setPricePerHour(court.pricePerHour);
    setCourtStatus(court.status || (court.active === false ? "inactive" : "active"));
    setSlotDurationMinutes(court.slotDurationMinutes === 30 ? 30 : 60);
    setDescription(court.description || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Save (Add or Update)
  const handleSaveCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessProfile?.businessId) {
      setFormError("Business profile not found. Please complete business setup first.");
      return;
    }

    if (!courtName.trim()) {
      setFormError("Court or Ground Name is required.");
      return;
    }

    const priceNum = Number(pricePerHour);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Please enter a valid price per hour (₹0 or greater).");
      return;
    }

    setSaving(true);
    setFormError(null);

    const sportObj = ALL_SPORTS_CATEGORIES.find((s) => s.id === sportId);
    const sportName = sportObj ? sportObj.name : sportId.replace("_", " ");

    const courtData: VenueCourt = {
      courtId: selectedCourt?.courtId || `court_${Date.now()}`,
      name: courtName.trim(),
      sportId,
      sportName,
      pricePerHour: priceNum,
      status: courtStatus,
      slotDurationMinutes,
      active: courtStatus === "active",
      description: description.trim(),
    };

    try {
      await saveCourt(businessProfile.businessId, courtData);
      await refreshBusinessProfile();
      setIsModalOpen(false);
      setSuccessMessage(
        selectedCourt
          ? `Court "${courtData.name}" updated successfully.`
          : `Court "${courtData.name}" added successfully.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to save court:", err);
      setFormError(err instanceof Error ? err.message : "Failed to save court.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!businessProfile?.businessId || !courtToDelete) return;
    setSaving(true);
    try {
      await deleteCourt(businessProfile.businessId, courtToDelete.courtId);
      await refreshBusinessProfile();
      setIsDeleteModalOpen(false);
      setCourtToDelete(null);
      setSuccessMessage(`Court "${courtToDelete.name}" deleted successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to delete court:", err);
      setFormError(err instanceof Error ? err.message : "Failed to delete court.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Court Status directly from list card
  const handleToggleStatusQuick = async (court: VenueCourt, nextStatus: CourtStatus) => {
    if (!businessProfile?.businessId) return;
    try {
      const updated: VenueCourt = {
        ...court,
        status: nextStatus,
        active: nextStatus === "active",
      };
      await saveCourt(businessProfile.businessId, updated);
      await refreshBusinessProfile();
    } catch (err) {
      console.error("Failed to toggle court status:", err);
    }
  };

  // Operating schedule change handler
  const handleScheduleDayChange = (
    day: keyof WeeklySchedule,
    field: keyof DaySchedule,
    value: boolean | string
  ) => {
    if (!schedule) return;
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        [field]: value,
      },
    });
  };

  // Apply Monday hours to all open days
  const handleApplyToAllDays = () => {
    if (!schedule) return;
    const mon = schedule.monday;
    const updated: WeeklySchedule = {
      monday: { ...mon },
      tuesday: { ...schedule.tuesday, openTime: mon.openTime, closeTime: mon.closeTime },
      wednesday: { ...schedule.wednesday, openTime: mon.openTime, closeTime: mon.closeTime },
      thursday: { ...schedule.thursday, openTime: mon.openTime, closeTime: mon.closeTime },
      friday: { ...schedule.friday, openTime: mon.openTime, closeTime: mon.closeTime },
      saturday: { ...schedule.saturday, openTime: mon.openTime, closeTime: mon.closeTime },
      sunday: { ...schedule.sunday, openTime: mon.openTime, closeTime: mon.closeTime },
    };
    setSchedule(updated);
  };

  // Save weekly operating schedule
  const handleSaveSchedule = async () => {
    if (!businessProfile?.businessId || !schedule) return;
    setSavingSchedule(true);
    try {
      await updateWeeklySchedule(businessProfile.businessId, schedule, {
        startTime: schedule.monday.openTime,
        endTime: schedule.monday.closeTime,
      });
      await refreshBusinessProfile();
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save schedule:", err);
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.24em] text-qc-lime font-medium">
              Phase 2 • Owner Management
            </span>
            <span className="border border-qc-lime/30 bg-qc-lime/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-qc-lime">
              Real Firestore Storage
            </span>
          </div>
          <h1 className="mt-2 font-display text-4xl text-qc-white md:text-5xl">
            Courts, Pricing & Schedule
          </h1>
          <p className="mt-1.5 text-sm text-qc-muted max-w-2xl">
            Manage your ground inventory, configure hourly prices, set maintenance status, and fine-tune your weekly operating hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button href="/owner/dashboard" variant="secondary" size="sm" className="gap-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Button>
          <Button onClick={handleOpenAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4 text-qc-black" />
            <span>Add Court / Ground</span>
          </Button>
        </div>
      </header>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between border border-qc-lime/40 bg-qc-lime/10 p-4 text-xs text-qc-lime">
          <div className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-qc-lime hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="border border-white/10 bg-qc-charcoal p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
              Total Courts
            </span>
            <Grid3X3 className="h-4 w-4 text-white/40" />
          </div>
          <p className="mt-3 font-display text-4xl text-qc-white">
            {courts.length}
          </p>
          <p className="mt-2 text-[11px] text-qc-muted">Configured grounds & pitches</p>
        </article>

        <article className="border border-qc-lime/30 bg-qc-lime/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-qc-lime">
              Active / Bookable
            </span>
            <Activity className="h-4 w-4 text-qc-lime" />
          </div>
          <p className="mt-3 font-display text-4xl text-qc-lime">
            {activeCourtsCount}
          </p>
          <p className="mt-2 text-[11px] text-qc-muted">Ready for match reservations</p>
        </article>

        <article className="border border-white/10 bg-qc-charcoal p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
              In Maintenance
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-3 font-display text-4xl text-amber-400">
            {maintenanceCourtsCount}
          </p>
          <p className="mt-2 text-[11px] text-qc-muted">Temporarily paused for upkeep</p>
        </article>

        <article className="border border-white/10 bg-qc-charcoal p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-qc-muted">
              Average Rate
            </span>
            <IndianRupee className="h-4 w-4 text-qc-lime" />
          </div>
          <p className="mt-3 font-display text-4xl text-qc-white">
            {formatINR(avgPricePerHour)}
            <span className="text-xs font-normal text-qc-muted ml-1">/hr</span>
          </p>
          <p className="mt-2 text-[11px] text-qc-muted">Across all configured courts</p>
        </article>
      </section>

      {/* Courts Inventory Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Inventory & Pricing</SectionLabel>
            <h2 className="mt-1 font-display text-2xl text-qc-white">
              Courts & Grounds List
            </h2>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 text-xs text-qc-lime hover:underline font-medium uppercase tracking-wider"
          >
            <Plus className="h-3.5 w-3.5" /> Add New
          </button>
        </div>

        {courts.length === 0 ? (
          <div className="border border-dashed border-white/15 bg-qc-charcoal/50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center border border-white/10 bg-qc-panel text-white/40">
              <Grid3X3 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-2xl text-qc-white">
              No Courts Configured Yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-xs text-qc-muted leading-relaxed">
              Add your sports courts, turf pitches, or badminton lanes with dedicated hourly pricing to allow slot booking.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={handleOpenAdd} size="sm" className="gap-2">
                <Plus className="h-4 w-4 text-qc-black" />
                <span>Add Your First Court</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courts.map((court) => {
              const status = court.status || (court.active === false ? "inactive" : "active");
              const sportObj = ALL_SPORTS_CATEGORIES.find((s) => s.id === court.sportId);

              return (
                <article
                  key={court.courtId}
                  className={`flex flex-col justify-between border p-5 transition ${
                    status === "active"
                      ? "border-white/10 bg-qc-charcoal hover:border-qc-lime/30"
                      : status === "maintenance"
                      ? "border-amber-500/30 bg-amber-950/10"
                      : "border-white/5 bg-qc-charcoal/40 opacity-70"
                  }`}
                >
                  <div>
                    {/* Top Status & Sport */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 border border-white/10 bg-qc-panel px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-qc-white">
                        <span>{sportObj?.emoji || "🏆"}</span>
                        <span>{court.sportName || court.sportId}</span>
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${
                          status === "active"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : status === "maintenance"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                            : "border-red-500/40 bg-red-500/10 text-red-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            status === "active"
                              ? "bg-emerald-400 animate-pulse"
                              : status === "maintenance"
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                        />
                        {status}
                      </span>
                    </div>

                    {/* Court Title */}
                    <h3 className="mt-3 font-display text-2xl text-qc-white">
                      {court.name}
                    </h3>

                    {court.description && (
                      <p className="mt-1 text-xs text-qc-muted line-clamp-2">
                        {court.description}
                      </p>
                    )}

                    {/* Pricing & Slot Duration */}
                    <div className="mt-4 flex items-baseline justify-between border-t border-white/8 pt-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-qc-muted block">
                          Hourly Pricing
                        </span>
                        <p className="font-display text-2xl text-qc-lime">
                          {formatINR(court.pricePerHour)}
                          <span className="text-xs font-normal text-white/50">/hr</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-qc-muted block">
                          Slot Step
                        </span>
                        <span className="font-mono text-xs text-white/80">
                          {court.slotDurationMinutes || 60} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3">
                    {/* Quick Status Select */}
                    <select
                      value={status}
                      onChange={(e) => handleToggleStatusQuick(court, e.target.value as CourtStatus)}
                      className="border border-white/10 bg-qc-panel px-2 py-1 text-[11px] text-white/70 focus:border-qc-lime focus:outline-none"
                    >
                      <option value="active" className="bg-qc-panel text-white">Active</option>
                      <option value="maintenance" className="bg-qc-panel text-white">Maintenance</option>
                      <option value="inactive" className="bg-qc-panel text-white">Inactive</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(court)}
                        className="flex h-7 w-7 items-center justify-center border border-white/10 bg-qc-panel text-qc-muted hover:border-qc-lime hover:text-qc-lime transition"
                        title="Edit Court"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setCourtToDelete(court);
                          setIsDeleteModalOpen(true);
                        }}
                        className="flex h-7 w-7 items-center justify-center border border-white/10 bg-qc-panel text-qc-muted hover:border-red-400 hover:text-red-400 transition"
                        title="Delete Court"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Operating Schedule Section */}
      <section className="border border-white/10 bg-qc-charcoal p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-qc-lime" />
              <h2 className="font-display text-2xl text-qc-white">
                Operating Schedule (7-Day Board)
              </h2>
            </div>
            <p className="mt-1 text-xs text-qc-muted">
              Configure open/closed days and operational hours. Used across player discovery and court slot availability.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApplyToAllDays}
              className="text-xs"
            >
              Apply Monday to All
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="gap-2 text-xs"
            >
              {savingSchedule ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-qc-black" />
                  <span>Save Schedule</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {scheduleSuccess && (
          <div className="flex items-center gap-2 border border-qc-lime/30 bg-qc-lime/10 p-3 text-xs text-qc-lime">
            <Check className="h-4 w-4" />
            <span>Weekly operating schedule saved successfully to Firestore!</span>
          </div>
        )}

        {schedule && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {DAYS_OF_WEEK.map(({ key, label }) => {
              const day = schedule[key];
              return (
                <div
                  key={key}
                  className={`flex flex-col justify-between border p-3.5 transition ${
                    day.isOpen
                      ? "border-white/10 bg-qc-panel"
                      : "border-white/5 bg-qc-panel/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/8 pb-2">
                    <span className="font-medium text-xs text-qc-white">
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleScheduleDayChange(key, "isOpen", !day.isOpen)}
                      className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-sm transition ${
                        day.isOpen
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {day.isOpen ? "OPEN" : "CLOSED"}
                    </button>
                  </div>

                  {day.isOpen ? (
                    <div className="mt-3 space-y-2 text-[11px]">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-qc-muted block">
                          Open
                        </label>
                        <input
                          type="time"
                          value={day.openTime}
                          onChange={(e) => handleScheduleDayChange(key, "openTime", e.target.value)}
                          className="mt-0.5 w-full border border-white/15 bg-black/40 px-2 py-1 font-mono text-qc-white focus:border-qc-lime focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-qc-muted block">
                          Close
                        </label>
                        <input
                          type="time"
                          value={day.closeTime}
                          onChange={(e) => handleScheduleDayChange(key, "closeTime", e.target.value)}
                          className="mt-0.5 w-full border border-white/15 bg-black/40 px-2 py-1 font-mono text-qc-white focus:border-qc-lime focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 text-center text-xs text-qc-muted font-mono py-2">
                      Closed all day
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Court Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-white/15 bg-qc-charcoal p-6 md:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-qc-lime" />
                <h3 className="font-display text-2xl text-qc-white">
                  {selectedCourt ? "Edit Court / Ground" : "Add New Court / Ground"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="text-qc-muted hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCourt} className="space-y-4 text-xs">
              {/* Court Name */}
              <div>
                <label className="block uppercase tracking-[0.14em] text-qc-muted mb-1">
                  Court / Ground Name *
                </label>
                <input
                  type="text"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  placeholder="e.g. Main Cricket Turf, Pitch A, Indoor Court 1"
                  className="w-full border border-white/15 bg-qc-panel px-3.5 py-2.5 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                  required
                />
              </div>

              {/* Sport Category & Status */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block uppercase tracking-[0.14em] text-qc-muted mb-1">
                    Sport *
                  </label>
                  <select
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                    className="w-full border border-white/15 bg-qc-panel px-3 py-2.5 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                  >
                    {availableSports.map((s) => (
                      <option key={s.id} value={s.id} className="bg-qc-panel text-white">
                        {s.emoji} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-[0.14em] text-qc-muted mb-1">
                    Court Status *
                  </label>
                  <select
                    value={courtStatus}
                    onChange={(e) => setCourtStatus(e.target.value as CourtStatus)}
                    className="w-full border border-white/15 bg-qc-panel px-3 py-2.5 text-sm text-qc-white focus:border-qc-lime focus:outline-none"
                  >
                    <option value="active" className="bg-qc-panel text-white">Active (Bookable)</option>
                    <option value="maintenance" className="bg-qc-panel text-white">Maintenance (Paused)</option>
                    <option value="inactive" className="bg-qc-panel text-white">Inactive (Offline)</option>
                  </select>
                </div>
              </div>

              {/* Pricing & Duration */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block uppercase tracking-[0.14em] text-qc-muted mb-1">
                    Price Per Hour (₹) *
                  </label>
                  <div className="flex items-center border border-white/15 bg-qc-panel px-3 py-1.5 focus-within:border-qc-lime">
                    <IndianRupee className="h-4 w-4 text-qc-lime mr-1" />
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={pricePerHour}
                      onChange={(e) => setPricePerHour(e.target.value)}
                      placeholder="800"
                      className="w-full bg-transparent font-mono text-sm text-qc-white focus:outline-none"
                      required
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-qc-muted">
                    Base hourly rate for standard slot reservations.
                  </p>
                </div>

                <div>
                  <label className="block uppercase tracking-[0.14em] text-qc-muted mb-1">
                    Slot Interval Step
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSlotDurationMinutes(30)}
                      className={`flex-1 border px-2 py-2 text-xs font-mono transition ${
                        slotDurationMinutes === 30
                          ? "border-qc-lime bg-qc-lime/20 text-qc-lime font-semibold"
                          : "border-white/10 bg-qc-panel text-qc-muted"
                      }`}
                    >
                      30 mins (1/2 hr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotDurationMinutes(60)}
                      className={`flex-1 border px-2 py-2 text-xs font-mono transition ${
                        slotDurationMinutes === 60
                          ? "border-qc-lime bg-qc-lime/20 text-qc-lime font-semibold"
                          : "border-white/10 bg-qc-panel text-qc-muted"
                      }`}
                    >
                      60 mins (1 hr)
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Description */}
              <div>
                <label className="block uppercase tracking-[0.14em] text-qc-muted mb-1">
                  Court Details / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Synthetic grass turf, floodlights included, net height adjustable."
                  className="w-full border border-white/15 bg-qc-panel px-3.5 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Court...</span>
                    </>
                  ) : (
                    <span>{selectedCourt ? "Save Changes" : "Create Court"}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && courtToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-red-500/30 bg-qc-charcoal p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-display text-2xl text-qc-white">
                Delete Court
              </h3>
            </div>
            <p className="text-xs text-qc-muted leading-relaxed">
              Are you sure you want to delete <strong className="text-qc-white">&ldquo;{courtToDelete.name}&rdquo;</strong>? This court will be removed from your venue inventory. Existing past booking records will remain preserved.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCourtToDelete(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="bg-red-500 text-white hover:bg-red-600 border-red-500 gap-2"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Confirm Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

