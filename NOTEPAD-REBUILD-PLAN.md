# Notepad Feature: Remove & Rebuild Design Plan

---

## Phase 1: Complete Removal of Notepad Feature

### 1. Remove Notepad UI Components
- [x] Delete or comment out all references to `<NotepadDialog />` in `App.tsx` and any other files
- [x] Remove the Notepad button from the main UI (e.g., the “Notepad” button in the header or toolbar)
- [x] Remove any Notepad-related imports in all files

### 2. Remove NotepadDialog Component
- [x] Delete the file: `dream-notions-app/src/components/NotepadDialog.tsx`
- [x] Remove any Notepad-related files in `src/components/ui/` if they are only used by Notepad

### 3. Remove Notepad State and Logic
- [x] Remove all state variables, hooks, and handlers related to Notepad in `App.tsx`:
  - [x] `showNotepadDialog`, `notepadTabs`, `setNotepadTabs`, etc.
  - [x] Any `useEffect` or functions for loading/saving Notepad data
- [x] Remove Notepad-related props and logic from any other components

### 4. Remove Notepad Persistence
- [x] Remove Notepad-related code from:
  - [x] `firestore-service.ts` (e.g., `saveNotepadTabs`, `subscribeToNotepadTabs`, etc.)
  - [x] Any localStorage utilities for Notepad
- [x] Remove Notepad-related types (e.g., `Tab` interface) if not used elsewhere

### 5. Clean Up Styles and Assets
- [x] Remove Notepad-specific CSS or Tailwind classes if they are not used elsewhere
- [ ] Remove any Notepad-related assets (icons, images, etc.) if not used elsewhere

### 6. Test the App
- [ ] Run the app on port 5173 and ensure there are no references or errors related to Notepad. The UI should not show any Notepad features

---

## Phase 2: Rebuild Notepad (Single Todo Tab Only)

**Goal:** Implement the Notepad dialog with only a single “Todo” tab. No tab navigation, no add/rename/delete tabs. All UI and logic for the notepad dialog, markdown textarea, and task management actions should work for this single tab. Persistence (save/load) should work for this single tab using Firestore (for authenticated users) and localStorage (for unauthenticated users).

### 1. Create NotepadDialog Component (Single Tab)
- [x] Create a new file: `dream-notions-app/src/components/NotepadDialog.tsx`
- [x] Implement the Notepad dialog UI for a single “Todo” tab
- [x] Add markdown textarea and all action buttons (Promote, Demote, Done, Move Up, Move Down, Save)
- [x] Style the dialog to match the screenshot

### 2. Integrate Notepad Into App
- [x] Add a “Notepad” button to the main UI to open the dialog
- [x] Add state and handlers in `App.tsx` to control dialog visibility and manage the single tab

### 3. Implement Persistence
- [x] For authenticated users: Save/load the single tab to/from Firestore
- [x] For unauthenticated users: Save/load the single tab to/from localStorage

### 4. Test and Polish
- [x] Test all Notepad features for the single tab
- [x] Test persistence across reloads
- [x] UI matches the screenshot exactly
- [x] Fix any bugs or visual mismatches

---

## Phase 3: Extend Notepad to Multi-Tab Support

**Goal:** Extend the Notepad dialog to support multiple tabs (add, rename, delete, switch tabs, persistence for all tabs).

### 1. Add Tab Navigation UI
- [ ] Add tab navigation (Tabs, add, rename, delete)
- [ ] Update state and persistence logic to handle an array of tabs

### 2. Update NotepadDialog and App Integration
- [ ] Ensure all actions (editing, moving, saving) work per tab
- [ ] Update Firestore/localStorage logic to save/load all tabs

### 3. Test and Polish
- [ ] Test tab creation, renaming, deletion, and persistence
- [ ] Test all Notepad features for multiple tabs
- [ ] UI matches the screenshot exactly
- [ ] Fix any bugs or visual mismatches

---

**Deliverable:**
- This file (`NOTEPAD-REBUILD-PLAN.md`) with checkboxes for each step so you can track progress or delegate to another AI/developer. 