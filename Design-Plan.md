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

1.  **Main Layout:** Build the main application layout in `App.tsx`, including the header, main content area, and the control panel section.
2.  **Header:** Create a static version of the header containing the "Dream-Notions" title.
3.  **Control Panel:** Implement the static UI for the "Add Notion" button and the Export/Import buttons.
4.  **Filter/Sort Controls:** Create the static UI for the "Recents," "Favorites," and sort toggle buttons.
5.  **Dream List (Static):** Create a static `DreamItem` component and display a few instances to match the layout in `Screenshot-1 Home-Page.png`.
6.  **Dream Form (Static):** Create a static `DreamForm` component (the "Edit Notion" modal) with all its fields (title, description, icon selector, tag selector) as seen in `Screenshot-2 Edit-Form.png`.

> **User Inspection:** After this phase, I will ask you to inspect the core UI to ensure it matches the visual reference before we proceed.
> **Self-Correction:** I will perform an `npm run build` after each element is developed to catch compilation errors proactively.

> **Git Checkpoint:** I will recommend a `git push` to save the static UI implementation.

### Phase 3: Local Logic & State Management

1.  **Data Structures:** Define the `DreamEntry`, `TagNode`, and `CustomIconConfig` interfaces in `src/types/DreamEntry.ts` and other relevant files.
2.  **Initial Data Import:** Implement the `parseImportMarkdown` function to read and parse the provided `Data-Export.md` file. This data will be used to pre-populate the application's local state.
3.  **Data Persistence (Local Storage):** Implement saving and loading of dream data to/from `localStorage` to ensure data persists across browser sessions. This will be integrated with the import/export functionality.
4.  **Local State:** Implement state management using React hooks (`useState`, `useEffect`) in `App.tsx` to manage a local list of dreams, initially populated from `localStorage` or imported data.
5.  **Add/Edit/Delete Logic:** Implement the core CRUD (Create, Read, Update, Delete) operations for dreams. All operations will only affect the local state and trigger `localStorage` updates.
6.  **Form Logic:** Wire up the `DreamForm` component to add and edit dreams in the local state.
7.  **Component Logic:** Implement the client-side logic for the `IconSelector` and `TagSelector` components.

> **User Inspection:** I will ask you to confirm that the imported data is correctly displayed and persists after refreshing the browser, and that the local CRUD functionality (adding, editing, and deleting dreams) works as expected.

> **Git Checkpoint:** A `git push` will be recommended to save this stable, locally-functional version of the app with imported data and persistence.

### Phase 4: Advanced Feature Implementation (Local)

1.  **Filtering & Sorting:** Implement the logic for filtering dreams by tag (including hierarchical tags), favorites, and recent entries. Implement the three-state sorting functionality (manual, newest, oldest).
2.  **Drag-and-Drop:** Add drag-and-drop functionality to manually reorder dream entries.
3.  **Import/Export:** Implement the `exportDreamsToMarkdown` and `parseImportMarkdown` functions. Wire them up to the UI to allow copying to and pasting from the clipboard.
4.  **List Planner:** Create the "List Planner" settings dialog, including the `EnhancedNotesEditor` with its todo/done list management features.
5.  **Theme Toggle:** Implement the light/dark theme switching functionality.

> **AI Context Note:** At the end of this phase, I will suggest that we can clear the AI's context memory. This will help me focus entirely on the upcoming Firebase integration without being encumbered by the details of the already-completed local logic.

> **User Inspection:** I will ask you to thoroughly test all the advanced features before we move to the final phase.

> **Git Checkpoint:** I will recommend a `git push` to mark the completion of all client-side features.

### Phase 5: Firebase & Backend Integration

*This phase will be handled last, as requested.*

1.  **Firebase Setup:** Guide you through creating a new Firebase project and obtaining the configuration credentials.
2.  **Firebase Service:** Create a `services/firebase-config.ts` file to initialize Firebase.
3.  **Authentication:** Implement Google Authentication using `signInWithPopup`. The UI will update to show the user's avatar and a "Sign Out" button when logged in.
4.  **Firestore Sync:**
    -   Replace the `localStorage` persistence with Firestore.
    -   Implement functions to save, update, and delete dreams in the `dreams` collection.
    -   Set up a real-time listener (`onSnapshot`) to keep the application data synced across devices.
    -   Implement the logic for syncing user-specific configurations (like custom icon names and the List Planner notes).

> **User Inspection:** I will ask you to perform a final test of the fully integrated application, including authentication and real-time database synchronization.

> **Git Checkpoint:** I will recommend a final `git push` before deployment.

### Phase 6: Deployment

1.  **Build Configuration:** Ensure the Vite build process is correctly configured.
2.  **Netlify Setup:** Create a `netlify.toml` file to specify the build command (`npm run build`) and the publish directory (`dist`).
3.  **Deployment:** Provide instructions on how to connect your Git repository to Netlify to enable continuous deployment.

This plan ensures a structured and iterative development process, with clear checkpoints for review and feedback.
