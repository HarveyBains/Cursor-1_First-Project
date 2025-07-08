# Design Plan: Dream-Notions Web App

## 1. Introduction

This document outlines the design and development plan for "Dream-Notions," a web application for journaling dreams and ideas. The goal is to recreate the functionality and design of the existing project found in `src/figma-make-project`, resulting in a modern, feature-rich, and deployable web app.

This plan is based on a thorough review of all provided source materials.

-   **Core Technology:** React (with Vite) and TypeScript.
-   **Styling:** Tailwind CSS.
-   **Backend & Authentication:** Firebase (Firestore and Google Authentication).
-   **Deployment:** Netlify.

### Source File Confirmation

-   **Technical Documentation:** `TECHNICAL-FEATURE-DOCUMENTATION-v13.0.0.md` has been reviewed and will be used as the primary guide for feature implementation.
-   **Application Logic:** The logic from the `App-*.tsx` files has been reviewed and will be ported to the new application.
-   **UI/UX Reference:** The screenshots, `Screenshot-1 Home-Page.png` and `Screenshot-2 Edit-Form.png`, have been reviewed and will be used as the visual reference for all UI components, styling, themes, and fonts. I have committed their look and feel to memory.

---

## 2. Step-by-Step Development Plan

The development process is broken down into sequential phases, starting with UI and graphical setup, followed by application logic, and finally backend integration.

### Phase 1: Project Scaffolding & Initial Setup

1.  **Initialize Project:** Create a new React project using Vite and TypeScript.
2.  **Install Dependencies:** Add Tailwind CSS to the project.
3.  **Configure Styling:** Set up the `tailwind.config.js` file. This will include defining the custom color palette (primary orange/purple, backgrounds, etc.) and fonts to match the visual reference from the screenshots and the `globals.css` file.
4.  **File Structure:** Create the initial directory structure: `/src/components`, `/src/services`, `/src/hooks`, `/src/types`, `/src/styles`.
5.  **Initial Commit:** Create the first commit with the basic project structure.

> **Git Checkpoint:** At the end of this phase, I will prompt you to perform a `git push` to save the initial project setup.

### Phase 2: Core UI & Static Component Implementation

1.  **Main Layout:** Built the main application layout in `App.tsx`, including the header, main content area, and the control panel section.
2.  **Header:** Created a static version of the header containing the "Dream-Notions" title, theme toggle, and user avatar/sign-in placeholders.
3.  **Control Panel:** Implemented the static UI for the "Add Notion" button and the Export/Import buttons.
4.  **Filter/Sort Controls:** Created the static UI for the "Recents," "Favorites," and sort toggle buttons.
5.  **Dream List (Static):** Created a static `DreamItem` component and displayed a few instances.
6.  **Dream Form (Static):** *To be implemented in a later phase.*

> **User Inspection:** The core UI has been inspected, and the header, control panel, and filter/sort controls are visually complete. The `DreamItem` component is displayed, but the dream title is currently truncated.

> **Self-Correction:** `npm run build` is performed after each element development to catch compilation errors proactively.

> **Git Checkpoint:** I will recommend a `git push` to save the static UI implementation.

### Phase 3: Local Logic & State Management

1.  **Data Structures:** Defined the `DreamEntry`, `TagNode`, and `CustomIconConfig` interfaces in `src/types/DreamEntry.ts` and other relevant files.
2.  **Initial Data Import:** Implemented the `parseImportMarkdown` function to read and parse the provided `Data-Export.md` file. This data is used to pre-populate the application's local state via the Import Dialog.
3.  **Data Persistence (Local Storage):** Implemented saving and loading of dream data to/from `localStorage` to ensure data persists across browser sessions. This is integrated with the import/export functionality.
4.  **Local State:** Implemented state management using React hooks (`useState`, `useEffect`) in `App.tsx` to manage a local list of dreams, initially populated from `localStorage` or imported data.
5.  **Add/Edit/Delete Logic:** *To be implemented.*
6.  **Form Logic:** *To be implemented.*
7.  **Component Logic:** *To be implemented.*

> **User Inspection:** The imported data is correctly displayed and persists after refreshing the browser. The dream title truncation issue in `DreamItem` needs to be resolved.

> **Git Checkpoint:** A `git push` will be recommended to save this stable, locally-functional version of the app with imported data and persistence.

### Phase 4: Advanced Feature Implementation (Local)

*This phase is pending completion of Phase 3.*

### Phase 5: Firebase & Backend Integration

*This phase is pending completion of Phase 4.*

### Phase 6: Deployment

*This phase is pending completion of Phase 5.*
