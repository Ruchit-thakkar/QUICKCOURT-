"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeToCustomers,
  createCustomerManually,
  updateCustomerProfile,
  archiveCustomer,
  getCustomerBookingHistory,
  normalizePhoneNumber,
} from "@/services/customerService";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/format";
import type { CRMCustomer, OwnerBooking } from "@/types";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Activity,
  Edit2,
  Archive,
  X,
  Loader2,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileText,
  Save,
} from "lucide-react";

export default function OwnerCustomersPage() {
  const { user, businessProfile } = useAuth();

  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "frequent">("all");

  // Selected Customer for Details Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [bookingHistory, setBookingHistory] = useState<OwnerBooking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  // Notes state inside drawer
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Add Customer Form state
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Edit Customer Form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time listener for customer records
  useEffect(() => {
    if (!businessProfile?.businessId || !user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToCustomers(
      businessProfile.businessId,
      user.uid,
      (items) => {
        setCustomers(items);
        setLoading(false);
      },
      (err) => {
        console.error("subscribeToCustomers error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [businessProfile?.businessId, user?.uid]);

  // Sync selected customer's notes draft when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setNotesDraft(selectedCustomer.notes || "");
      setNotesSuccess(false);

      // Fetch customer's booking history
      setLoadingHistory(true);
      getCustomerBookingHistory(
        selectedCustomer.businessId,
        selectedCustomer.phone,
        user?.uid
      ).then((list) => {
        setBookingHistory(list);
        setLoadingHistory(false);
      }).catch((err) => {
        console.error("getCustomerBookingHistory error:", err);
        setLoadingHistory(false);
      });
    }
  }, [selectedCustomer, user?.uid]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalPlayers = customers.length;
    const activePlayers = customers.filter((c) => c.status === "active").length;
    const totalBookings = customers.reduce((sum, c) => sum + (c.totalBookings || 0), 0);
    const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const avgSpent = totalPlayers > 0 ? Math.round(totalSpent / totalPlayers) : 0;

    return {
      totalPlayers,
      activePlayers,
      totalBookings,
      totalSpent,
      avgSpent,
    };
  }, [customers]);

  // Filter & Search Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchPhone = c.phone?.includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }

      // Filter by Status / Activity
      if (statusFilter === "active" && c.status !== "active") return false;
      if (statusFilter === "inactive" && c.status !== "inactive") return false;
      if (statusFilter === "frequent" && (c.totalBookings || 0) < 5) return false;

      return true;
    });
  }, [customers, searchQuery, statusFilter]);

  // Format date helper
  const formatDate = (dateVal: any): string => {
    if (!dateVal) return "None yet";
    try {
      let d: Date;
      if (dateVal.toDate) {
        d = dateVal.toDate();
      } else if (typeof dateVal === "string") {
        d = new Date(dateVal);
      } else if (dateVal instanceof Date) {
        d = dateVal;
      } else {
        return "Recent";
      }
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  // Handle Add Customer Form Submit
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim()) {
      setAddError("Customer name is required.");
      return;
    }
    const cleanPhone = normalizePhoneNumber(addPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      setAddError("A valid contact phone number is required (e.g. +91 98765 43210).");
      return;
    }
    if (!businessProfile?.businessId || !user?.uid) {
      setAddError("Missing business account session. Please refresh.");
      return;
    }

    setAddingCustomer(true);
    try {
      const customerId = await createCustomerManually({
        businessId: businessProfile.businessId,
        ownerId: user.uid,
        name: addName.trim(),
        phone: cleanPhone,
        email: addEmail.trim() || undefined,
        notes: addNotes.trim() || undefined,
      });

      setShowAddModal(false);
      setAddName("");
      setAddPhone("");
      setAddEmail("");
      setAddNotes("");

      // Open new customer drawer
      const created = customers.find((c) => c.customerId === customerId);
      if (created) setSelectedCustomer(created);
    } catch (err: unknown) {
      console.error("createCustomerManually error:", err);
      setAddError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setAddingCustomer(false);
    }
  };

  // Save CRM Notes
  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    setSavingNotes(true);
    try {
      await updateCustomerProfile(selectedCustomer.customerId, {
        notes: notesDraft,
      });
      setSelectedCustomer((prev) => (prev ? { ...prev, notes: notesDraft } : null));
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 3000);
    } catch (err) {
      console.error("Save notes error:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Open Edit Customer Modal
  const handleOpenEdit = () => {
    if (!selectedCustomer) return;
    setEditName(selectedCustomer.name);
    setEditPhone(selectedCustomer.phone);
    setEditEmail(selectedCustomer.email || "");
    setEditError(null);
    setShowEditModal(true);
  };

  // Submit Edit Customer
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Customer name is required.");
      return;
    }
    const cleanPhone = normalizePhoneNumber(editPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      setEditError("A valid phone number is required.");
      return;
    }

    setSavingEdit(true);
    try {
      await updateCustomerProfile(selectedCustomer.customerId, {
        name: editName.trim(),
        phone: cleanPhone,
        email: editEmail.trim(),
      });

      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              phone: cleanPhone,
              email: editEmail.trim(),
            }
          : null
      );
      setShowEditModal(false);
    } catch (err: unknown) {
      console.error("updateCustomerProfile error:", err);
      setEditError(err instanceof Error ? err.message : "Failed to update player details.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Archive Customer
  const handleArchiveConfirm = async () => {
    if (!selectedCustomer) return;
    setActionLoading(true);
    try {
      await archiveCustomer(selectedCustomer.customerId);
      setSelectedCustomer((prev) => (prev ? { ...prev, status: "inactive" } : null));
      setShowArchiveModal(false);
    } catch (err) {
      console.error("archiveCustomer error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Booking History
  const filteredBookingHistory = useMemo(() => {
    if (historyFilter === "all") return bookingHistory;
    return bookingHistory.filter((b) => b.bookingStatus === historyFilter);
  }, [bookingHistory, historyFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Customers</SectionLabel>
          <h1 className="mt-2 font-display text-4xl text-qc-white md:text-5xl">
            Player CRM
          </h1>
          <p className="mt-1 text-sm text-qc-muted">
            Manage your players, track lifetime value, view reservation history, and record player notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      </header>

      {/* CRM Statistics Bar */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Players"
          value={String(stats.totalPlayers)}
          subtext="Unique venue player profiles"
        />
        <StatCard
          icon={Activity}
          label="Active Players"
          value={String(stats.activePlayers)}
          subtext="Booked within last 90 days"
          accent
        />
        <StatCard
          icon={Calendar}
          label="Total Bookings"
          value={String(stats.totalBookings)}
          subtext="Reservations completed or confirmed"
        />
        <StatCard
          icon={IndianRupee}
          label="Avg Player Spend"
          value={formatINR(stats.avgSpent)}
          subtext={`Total revenue: ${formatINR(stats.totalSpent)}`}
        />
      </section>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-none border border-white/10 bg-qc-charcoal p-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players by name, phone (+91...), or email..."
            className="w-full border border-white/10 bg-qc-panel py-2 pl-9 pr-4 text-xs text-qc-white placeholder:text-white/30 focus:border-qc-lime focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs transition ${
              statusFilter === "all"
                ? "border border-qc-lime bg-qc-lime/10 text-qc-lime font-medium"
                : "border border-white/10 bg-qc-panel text-white/60 hover:text-white"
            }`}
          >
            All Players ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 text-xs transition ${
              statusFilter === "active"
                ? "border border-emerald-500 bg-emerald-500/10 text-emerald-400 font-medium"
                : "border border-white/10 bg-qc-panel text-white/60 hover:text-white"
            }`}
          >
            Active ({customers.filter((c) => c.status === "active").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("frequent")}
            className={`px-3 py-1.5 text-xs transition ${
              statusFilter === "frequent"
                ? "border border-amber-500 bg-amber-500/10 text-amber-400 font-medium"
                : "border border-white/10 bg-qc-panel text-white/60 hover:text-white"
            }`}
          >
            Frequent (5+)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 text-xs transition ${
              statusFilter === "inactive"
                ? "border border-red-500 bg-red-500/10 text-red-400 font-medium"
                : "border border-white/10 bg-qc-panel text-white/60 hover:text-white"
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Main Customers List / Table */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center border border-white/10 bg-qc-charcoal py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-qc-lime" />
          <p className="mt-3 text-sm text-qc-muted">Loading players...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center border border-white/10 bg-qc-charcoal p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-qc-panel text-white/40">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-2xl text-qc-white">
            {searchQuery || statusFilter !== "all"
              ? "No players found"
              : "No players yet"}
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-qc-muted leading-relaxed">
            {searchQuery || statusFilter !== "all"
              ? "Try a different name, phone number, or filter option to find matching players."
              : "Customers will automatically appear here when they make their first booking, or you can manually register players below."}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="mt-6 gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-white/10 bg-qc-charcoal">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-qc-panel/60 text-[10px] uppercase tracking-[0.16em] text-qc-muted">
                  <th className="py-3 px-4 font-medium">Player</th>
                  <th className="py-3 px-4 font-medium">Phone Number</th>
                  <th className="py-3 px-4 font-medium">Bookings</th>
                  <th className="py-3 px-4 font-medium">Total Spent</th>
                  <th className="py-3 px-4 font-medium">Last Visit</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.customerId}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-qc-panel/50 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-medium text-qc-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-display text-sm text-qc-lime font-bold">
                          {c.name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <p className="text-qc-white">{c.name}</p>
                          {c.email && (
                            <p className="text-[11px] text-qc-muted truncate max-w-[180px]">
                              {c.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white/80">
                      {c.phone}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-qc-white">
                      {c.totalBookings}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-qc-lime">
                      {formatINR(c.totalSpent || 0)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white/70">
                      {formatDate(c.lastBookingAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-qc-lime">
                      <div className="flex items-center justify-end gap-1 text-[11px] hover:underline">
                        <span>Profile</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid gap-3 md:hidden">
            {filteredCustomers.map((c) => (
              <div
                key={c.customerId}
                onClick={() => setSelectedCustomer(c)}
                className="border border-white/10 bg-qc-panel p-4 space-y-3 cursor-pointer hover:border-qc-lime/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-display text-sm text-qc-lime font-bold">
                      {c.name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-qc-white">{c.name}</h4>
                      <p className="font-mono text-xs text-qc-muted">{c.phone}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${
                      c.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-white/8 pt-2.5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-qc-muted block">Bookings:</span>
                    <span className="text-qc-white">{c.totalBookings}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-qc-muted block">Total Spent:</span>
                    <span className="text-qc-lime font-medium">{formatINR(c.totalSpent || 0)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/8 pt-2 text-[11px]">
                  <span className="text-qc-muted">
                    Last Visit: {formatDate(c.lastBookingAt)}
                  </span>
                  <span className="text-qc-lime font-medium flex items-center gap-1">
                    View &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* DRAWER: PLAYER PROFILE & BOOKING HISTORY */}
      {/* ========================================================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm">
          <div className="relative h-full w-full max-w-xl border-l border-white/15 bg-qc-charcoal p-6 sm:p-8 overflow-y-auto space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-qc-lime/10 border border-qc-lime/30 text-qc-lime font-display text-xl font-bold">
                  {selectedCustomer.name?.charAt(0) || "P"}
                </div>
                <div>
                  <h3 className="font-display text-2xl text-qc-white">
                    {selectedCustomer.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-semibold ${
                        selectedCustomer.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {selectedCustomer.status}
                    </span>
                    <span className="font-mono text-xs text-qc-muted">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenEdit}
                  title="Edit details"
                  className="border border-white/10 bg-qc-panel p-1.5 text-white/60 hover:text-qc-lime hover:border-qc-lime/40 transition"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="border border-white/10 bg-qc-panel p-1.5 text-white/60 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-white/10 bg-qc-panel p-3">
                <span className="text-[10px] uppercase tracking-wider text-qc-muted block">
                  Bookings
                </span>
                <span className="mt-1 font-display text-2xl text-qc-white">
                  {selectedCustomer.totalBookings}
                </span>
              </div>
              <div className="border border-white/10 bg-qc-panel p-3">
                <span className="text-[10px] uppercase tracking-wider text-qc-muted block">
                  Total Spent
                </span>
                <span className="mt-1 font-display text-2xl text-qc-lime">
                  {formatINR(selectedCustomer.totalSpent || 0)}
                </span>
              </div>
              <div className="border border-white/10 bg-qc-panel p-3">
                <span className="text-[10px] uppercase tracking-wider text-qc-muted block">
                  Avg Value
                </span>
                <span className="mt-1 font-display text-2xl text-white">
                  {selectedCustomer.totalBookings > 0
                    ? formatINR(
                        Math.round(
                          (selectedCustomer.totalSpent || 0) /
                            selectedCustomer.totalBookings
                        )
                      )
                    : "₹0"}
                </span>
              </div>
            </div>

            {/* Player Details & Timeline */}
            <div className="border border-white/10 bg-qc-panel/60 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-qc-muted">Contact Phone:</span>
                <span className="font-mono text-qc-white">{selectedCustomer.phone}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-qc-muted">Email Address:</span>
                <span className="text-qc-white">
                  {selectedCustomer.email || "Not provided"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-qc-muted">Favorite Sport:</span>
                <span className="text-qc-white capitalize">
                  {selectedCustomer.favoriteSport || "Cricket"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-qc-muted">First Booking:</span>
                <span className="font-mono text-white/80">
                  {formatDate(selectedCustomer.firstBookingAt)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-qc-muted">Last Visit:</span>
                <span className="font-mono text-qc-lime font-medium">
                  {formatDate(selectedCustomer.lastBookingAt)}
                </span>
              </div>
            </div>

            {/* CRM Notes Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-qc-lime" />
                  <span className="text-xs uppercase tracking-[0.14em] text-qc-muted font-medium">
                    Owner CRM Notes
                  </span>
                </div>
                {notesSuccess && (
                  <span className="text-[11px] text-qc-lime flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add private venue notes (e.g. Regular weekend bowler, prefers Turf 1, paid advance)..."
                className="w-full border border-white/15 bg-qc-panel px-3.5 py-2.5 text-xs text-qc-white placeholder:text-white/25 focus:border-qc-lime focus:outline-none"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingNotes ? "Saving..." : "Save Notes"}</span>
                </Button>
              </div>
            </div>

            {/* Booking History Section */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-qc-white">
                  Booking History ({bookingHistory.length})
                </span>
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="border border-white/10 bg-qc-panel px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="all">All Games</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center p-8 border border-white/5 bg-qc-panel/30">
                  <Loader2 className="h-5 w-5 animate-spin text-qc-lime" />
                  <span className="ml-2 text-xs text-qc-muted">Loading reservations...</span>
                </div>
              ) : filteredBookingHistory.length === 0 ? (
                <div className="border border-dashed border-white/10 bg-qc-panel/30 p-6 text-center">
                  <p className="text-xs text-qc-muted">
                    No reservations matching filter found for this player.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredBookingHistory.map((b) => (
                    <div
                      key={b.bookingId}
                      className="border border-white/8 bg-qc-panel p-3 text-xs flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-qc-white capitalize">
                            {b.sport?.name}
                          </span>
                          <span className="text-[10px] text-qc-muted">
                            · {b.court?.name}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-qc-lime">
                          {b.gameDate} · {b.startTime} - {b.endTime}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-display text-sm text-qc-white">
                          {formatINR(b.pricing?.total || 0)}
                        </p>
                        <span
                          className={`text-[9px] uppercase tracking-wider font-semibold ${
                            b.bookingStatus === "confirmed"
                              ? "text-qc-lime"
                              : b.bookingStatus === "cancelled"
                              ? "text-red-400"
                              : "text-amber-400"
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Archive Action */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              {selectedCustomer.status === "active" ? (
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(true)}
                  className="text-xs text-red-400/80 hover:text-red-400 flex items-center gap-1.5 transition"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archive Customer</span>
                </button>
              ) : (
                <span className="text-xs text-qc-muted">
                  Customer is currently inactive
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 1: ADD CUSTOMER MANUALLY */}
      {/* ========================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md border border-white/15 bg-qc-charcoal p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-qc-lime font-medium">
                  Player Registration
                </span>
                <h3 className="font-display text-2xl text-qc-white">
                  Add Customer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted">
                  Player Name *
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Rahul Patel"
                  className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                  required
                />
                <p className="mt-1 text-[10px] text-qc-muted">
                  Used for unique customer identification and deduplication.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted">
                  CRM Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Preferences, preferred slot hours, regular team name..."
                  className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={addingCustomer}
                  className="gap-2"
                >
                  {addingCustomer ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Register Player</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: EDIT CUSTOMER DETAILS */}
      {/* ========================================================== */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md border border-white/15 bg-qc-charcoal p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-xl text-qc-white">
                Edit Player Information
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted">
                  Player Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 font-mono text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-qc-muted">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full border border-white/15 bg-qc-panel px-3 py-2 text-xs text-qc-white focus:border-qc-lime focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: ARCHIVE CUSTOMER CONFIRMATION */}
      {/* ========================================================== */}
      {showArchiveModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md border border-white/15 bg-qc-charcoal p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-red-500/10 text-red-400 border border-red-500/30">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl text-qc-white">
                  Archive Customer?
                </h3>
                <p className="text-xs text-qc-muted">
                  {selectedCustomer.name} ({selectedCustomer.phone})
                </p>
              </div>
            </div>

            <p className="text-xs text-qc-muted leading-relaxed">
              Archiving sets this customer status to <strong>inactive</strong>. All historical reservation records, booking timestamps, and transaction data will remain safe and available.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowArchiveModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleArchiveConfirm}
                disabled={actionLoading}
                className="bg-red-500 text-white hover:bg-red-600 border-red-500"
              >
                {actionLoading ? "Archiving..." : "Archive"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`border p-5 transition ${
        accent
          ? "border-qc-lime/30 bg-qc-lime/5"
          : "border-white/10 bg-qc-charcoal"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-qc-muted font-medium">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${accent ? "text-qc-lime" : "text-white/40"}`} />
      </div>
      <p className="mt-2.5 font-display text-4xl text-qc-white md:text-5xl">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-qc-muted">{subtext}</p>
    </article>
  );
}
