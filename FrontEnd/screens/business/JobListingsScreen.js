// FrontEnd/screens/business/JobListingsScreen.js
// Full CRUD for job listings: list, create, edit, toggle active/inactive, delete.
import React, { useEffect, useState, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput,
  Modal, ScrollView, Switch, SafeAreaView, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const JOB_TYPES = ["full-time", "part-time", "casual"];

const EMPTY_FORM = {
  job_title:       "",
  job_type:        "full-time",
  salary_range:    "",
  job_description: "",
};

export default function JobListingsScreen() {
  const [jobs,      setJobs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJob,   setEditingJob]   = useState(null);  // null = create, object = edit
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [formError,    setFormError]    = useState("");

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await api.get("/jobs");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("JobListingsScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalVisible(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setForm({
      job_title:       job.job_title       ?? "",
      job_type:        job.job_type        ?? "full-time",
      salary_range:    job.salary_range    ?? "",
      job_description: job.job_description ?? "",
    });
    setFormError("");
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditingJob(null); };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.job_title.trim()) {
      setFormError("Job title is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      let res;
      if (editingJob) {
        res = await api.put(`/jobs/${editingJob.id}`, form);
      } else {
        res = await api.post("/jobs", form);
      }
      const data = await res.json();
      if (res.ok) {
        closeModal();
        fetchJobs();
      } else {
        setFormError(data.error ?? "Failed to save job listing.");
      }
    } catch {
      setFormError("Network error — is the server running?");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active/inactive ─────────────────────────────────────────────────
  const handleToggle = async (job) => {
    try {
      const res = await api.patch(`/jobs/${job.id}/toggle`, {});
      if (res.ok) {
        setJobs(prev =>
          prev.map(j => j.id === job.id ? { ...j, is_active: !j.is_active } : j)
        );
      }
    } catch {}
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (job) => {
    Alert.alert(
      "Delete Job Listing",
      `Are you sure you want to delete "${job.job_title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.delete(`/jobs/${job.id}`);
              if (res.ok) setJobs(prev => prev.filter(j => j.id !== job.id));
              else Alert.alert("Error", "Failed to delete listing.");
            } catch {
              Alert.alert("Error", "Network error.");
            }
          },
        },
      ]
    );
  };

  // ── Job card ────────────────────────────────────────────────────────────────
  const renderJob = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle}>{item.job_title}</Text>
          {item.job_type ? (
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{item.job_type}</Text>
            </View>
          ) : null}
        </View>
        {/* Active toggle */}
        <View style={styles.toggleWrap}>
          <Text style={[styles.toggleLabel, { color: item.is_active ? COLORS.success : COLORS.textMuted }]}>
            {item.is_active ? "Active" : "Paused"}
          </Text>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggle(item)}
            trackColor={{ false: COLORS.border, true: COLORS.success + "80" }}
            thumbColor={item.is_active ? COLORS.success : COLORS.textMuted}
          />
        </View>
      </View>

      {item.salary_range ? (
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.salary_range}</Text>
        </View>
      ) : null}

      {item.job_description ? (
        <Text style={styles.description} numberOfLines={2}>{item.job_description}</Text>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={15} color={COLORS.primary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={jobs}
            keyExtractor={item => item.id?.toString()}
            renderItem={renderJob}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchJobs(true)}
                tintColor={COLORS.primary}
              />
            }
            ListHeaderComponent={
              jobs.length > 0 ? (
                <Text style={styles.listHeader}>
                  {jobs.length} listing{jobs.length !== 1 ? "s" : ""}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="briefcase-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Job Listings</Text>
                <Text style={styles.emptySub}>Tap the + button to post your first opening.</Text>
              </View>
            }
          />

          {/* FAB */}
          <TouchableOpacity style={styles.fab} onPress={openCreate}>
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create / Edit modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.modalInner}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingJob ? "Edit Listing" : "New Job Listing"}
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Job title */}
              <Text style={styles.label}>Job Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Barista, Sales Assistant"
                placeholderTextColor={COLORS.textMuted}
                value={form.job_title}
                onChangeText={v => setForm(f => ({ ...f, job_title: v }))}
              />

              {/* Job type chips */}
              <Text style={styles.label}>Job Type</Text>
              <View style={styles.chipRow}>
                {JOB_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, form.job_type === t && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, job_type: t }))}
                  >
                    <Text style={[styles.chipText, form.job_type === t && styles.chipTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Salary */}
              <Text style={styles.label}>Pay / Salary</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. £12/hr · £25,000–£30,000/yr"
                placeholderTextColor={COLORS.textMuted}
                value={form.salary_range}
                onChangeText={v => setForm(f => ({ ...f, salary_range: v }))}
              />

              {/* Description */}
              <Text style={styles.label}>Job Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Describe the role, key responsibilities…"
                placeholderTextColor={COLORS.textMuted}
                value={form.job_description}
                onChangeText={v => setForm(f => ({ ...f, job_description: v }))}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.submitText}>{editingJob ? "Save Changes" : "Post Listing"}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  list:   { padding: SPACING.md, flexGrow: 1, backgroundColor: COLORS.background },
  listHeader: {
    fontSize: 13, color: COLORS.textSecondary, fontWeight: "600",
    marginBottom: SPACING.sm, textTransform: "uppercase", letterSpacing: 0.5,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    ...SHADOWS.md,
  },
  cardHeader:   { flexDirection: "row", alignItems: "flex-start", marginBottom: SPACING.sm },
  jobTitle:     { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  typeChip:     { alignSelf: "flex-start", backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  typeChipText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
  toggleWrap:   { alignItems: "flex-end", gap: 2 },
  toggleLabel:  { fontSize: 11, fontWeight: "600" },

  detailRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  detailText:  { fontSize: 13, color: COLORS.textSecondary },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 2, marginBottom: SPACING.sm },

  cardActions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  editBtn:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  editBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
  deleteBtn:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  deleteBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: "600" },

  fab: {
    position:        "absolute",
    bottom:          24,
    right:           24,
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: COLORS.primary,
    alignItems:      "center",
    justifyContent:  "center",
    ...SHADOWS.md,
  },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: "center" },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalInner:     { padding: SPACING.lg, paddingBottom: 40 },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg },
  modalTitle:     { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary },

  label: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor:   COLORS.card,
    borderWidth:       1.5,
    borderColor:       COLORS.border,
    borderRadius:      RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical:   13,
    fontSize:          15,
    color:             COLORS.textPrimary,
    marginBottom:      SPACING.md,
    ...SHADOWS.sm,
  },
  inputMultiline: { minHeight: 100, paddingTop: 13, textAlignVertical: "top" },

  chipRow:       { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  chip:          { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive:    { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText:      { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  chipTextActive:{ color: COLORS.primary },

  errorBox:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },

  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", ...SHADOWS.sm },
  submitBtnDisabled: { opacity: 0.7 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
