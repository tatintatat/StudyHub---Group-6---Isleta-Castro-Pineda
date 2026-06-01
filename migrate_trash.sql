-- Migration: Add soft-delete (Trash Bin) support to subjects
-- Run this ONCE on any existing StudyHub database that was set up before the trash feature.
-- Safe to run multiple times — IF NOT EXISTS prevents errors.

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_deleted ON subjects(user_id, deleted_at);
