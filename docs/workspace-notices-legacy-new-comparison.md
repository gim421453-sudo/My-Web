# Workspace Notices Legacy/New Comparison

## Scope

This review covers the read-only `app-next` workspace notices tab and the legacy operational notice display. It does not change Firestore documents, rules, indexes, `app.js`, `index.html`, or root `services/*`.

## Actual Data Sources

| Surface | Source | Read mode | Write on read |
| --- | --- | --- | --- |
| Legacy operational notice tab | `store.notices` | Populated by `services/workspaceDataService.js` from `workspaces/{workspaceId}/notices` | No |
| Legacy system-owner workspace notice table | `systemOwnerStateV54.workspaceNotices` | Populated by system admin service from workspace notice documents | No |
| app-next workspace notices | `workspaces/{workspaceId}/notices` | `getDocs` one-time read | No |

No global notice collection is merged into the app-next workspace notice tab. System notices are a separate operational surface and remain out of scope for this read-only tab.

## Legacy Store Flow

1. `services/workspaceDataService.js` starts one listener per workspace collection.
2. The `notices` listener maps each Firestore document to `{ id, ...data }`.
3. `store.notices` is replaced with the snapshot rows after pending-local and privacy filtering.
4. `visibleNotices()` removes workspace mismatches, deleted/archived/hidden rows, and expired rows.
5. `filteredRowsV7("notices")` applies UI filters but no additional notice sort.
6. `renderNoticesSplitV81()` splits general/system notices.
7. `renderNoticeCardsV81()` renders:
   - title: `title || name || "제목 없음"`
   - category/meta: `[date, subject, source || category].filter(Boolean).join(" · ")`
   - preview: `content || memo || description || ""`

The system-owner workspace notice management table is different: it sorts workspace notices by `createdAt` descending and shows management-only columns.

## Mixed Schemas

| Schema kind | Recognition basis | Main fields |
| --- | --- | --- |
| `modern_workspace_notice` | `createdFrom`, `scope`, `authorRole`, `priority`, author uid/email, or `visibility: "workspace"` | `title`, `content`, `createdAt`, `priority`, `pinned`, `author*` |
| `legacy_general_notice` | Legacy notice fields without school/academy source | `noticeDate`, `notice_date`, `visibility`, `importance`, `deadline`, `memo`, `content` |
| `legacy_school_notice` | Legacy fields plus `source/category/type/noticeType/subject` indicating school | Same as legacy, often `source: "학교"`, `subject: "공통"` |
| `legacy_academy_notice` | Legacy fields plus academy source | Same as legacy, often `source: "학원"` |
| `system_notice_reference` | `isSystem`, `system`, or system source/type/category | `title`, `content`, system labels |
| `unknown_notice_schema` | Visible document that does not match known schemas | Shown with safe defaults and counted in diagnostics |

## Canonical Display Model

app-next now converts every visible document to:

```text
id
schemaKind
title
summary
fullContent/detailText
categoryLabel
scopeLabel
publishedAt
importanceLabel
isPinned
authorDisplayName
hasAttachment
externalLink
sourceOrder
```

Raw field names, full UID, full email, workspace IDs, Firebase paths, and token-like identifiers are not shown in the read-only detail view.

## Mapping Rules

| Display value | Priority |
| --- | --- |
| Title | `title -> name -> 제목 없음` |
| Summary/detail | `content -> memo -> description -> message -> body -> text -> summary` |
| Category label | Legacy card meta `[date, subject, source/category]`, then system/workspace/default labels |
| Scope label | `scope/visibility`, schema fallback |
| Importance | `importance -> priority -> 보통` |
| Date | Legacy: `noticeDate -> notice_date -> date -> publishedAt -> createdAt -> updatedAt`; modern: `publishedAt -> createdAt -> updatedAt -> noticeDate -> notice_date -> date` |
| Author | Safe display-name fields only: `authorName -> createdByName -> writerName -> displayName -> author -> created_by`; email/UID-like values are hidden |

## Ordering

The previous app-next diagnostic reported `firestore-return-order`, which was too vague for mixed schemas. app-next now uses:

```text
pinned desc -> published/created/notice date desc -> legacy snapshot order -> document id asc
```

This aligns better with the workspace notice management surface while preserving legacy snapshot order when documents have no usable date or pinned value.

## Current Difference From Legacy

The operational general notice tab still uses pure `store.notices` order after filtering. The system-owner workspace notice management table sorts by `createdAt` descending. app-next intentionally follows the workspace-notice read-only interpretation, not the editable notice modal.

## Diagnostics

Development diagnostics now include:

```text
rawReadCount
schemaKindCounts
unknownSchemaCount
sourceCounts
filteredCount
displayedCount
sortPolicy
contentMappingBySchema
authorMappingBySchema
dateMappingBySchema
categoryMappingBySchema
```

No raw document values are printed in these diagnostics.
