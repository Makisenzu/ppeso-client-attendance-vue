-- =============================================================================
-- Migration: 20261119000200_pacd_files_xlsx.sql
-- Purpose:   Files page — also accept Excel workbooks (.xlsx), alongside PDF and Word (.docx). Still ≤ 20 MB.
-- =============================================================================

begin;

alter table core.pacd_files drop constraint if exists pacd_files_mime_type_check;
alter table core.pacd_files
  add constraint pacd_files_mime_type_check check (
    mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  );

update storage.buckets
   set allowed_mime_types = array[
     'application/pdf',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
   ]
 where id = 'pacd-files';

commit;
