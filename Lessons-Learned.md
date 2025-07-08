# Lessons Learned: Dream-Notions Web App Development

This document summarizes key problems encountered and their solutions during the initial development of the Dream-Notions web application.

---

## 1. Tailwind CSS Version Incompatibility

-   **Problem:** Initial `npm create vite` setup installed a Tailwind CSS version that caused build failures and a blank screen.
-   **Solution:** Uninstalled the problematic version and explicitly installed a known stable version (`tailwindcss@3.3.3`).
-   **Summary:** Always verify and, if necessary, specify stable versions for core dependencies to avoid unexpected compatibility issues.

## 2. Initial Blank Screen & Build Errors

-   **Problem:** After initial setup, the web app displayed a blank screen, and `npm run build` revealed TypeScript errors (e.g., `setCount` undefined, `React` unused).
-   **Solution:** Systematically debugged by running `npm run build` to identify specific errors. Corrected `App.tsx` boilerplate and adjusted TypeScript import statements (`import type`).
-   **Summary:** Proactive and frequent build checks (`npm run build`) are crucial for early error detection, especially during initial setup and after significant code changes.

## 3. Theming & Color Matching

-   **Problem:** Initial dark theme colors (header background, subtitle, primary title) did not match the desired Obsidian-like aesthetic (appeared brown/pink).
-   **Solution:** Iteratively adjusted HSL color values for `card`, `muted-foreground`, and `primary` in `src/index.css` based on user feedback and reference screenshots until visual alignment was achieved.
-   **Summary:** Visual requirements, especially nuanced color palettes, often require iterative refinement and direct user feedback. HSL values can be precise but require careful tuning.

## 4. Data Import (`.md` file) Resolution

-   **Problem:** Direct import of `Data-Export.md?raw` failed due to Vite's module resolution and TypeScript's type checking.
-   **Solution:** Bypassed module resolution by embedding the markdown content directly as a string literal in `App.tsx` for initial setup. (Future: Implement proper file input/parsing via UI).
-   **Summary:** For non-standard file imports or complex module resolution scenarios, consider direct content embedding or robust file input mechanisms as alternatives.

## 5. Lack of Data Persistence

-   **Problem:** Imported data was lost upon browser refresh or server restart.
-   **Solution:** Implemented `localStorage` utilities (`saveToLocalStorage`, `loadFromLocalStorage`) and integrated them into `App.tsx` to save/load the `dreams` state.
-   **Summary:** For client-side applications, `localStorage` is a simple and effective solution for basic data persistence across sessions.

## 6. Proactive Error Checking (Process Improvement)

-   **Problem:** The agent was not proactively running `npm run build` after each development step, leading to user frustration when errors appeared on the web page.
-   **Solution:** Updated the `Design-Plan.md` to explicitly include an `npm run build` step after each UI element development, ensuring self-correction before user review.
-   **Summary:** Integrate automated checks (like build commands) into the development workflow to catch errors early and improve the user experience. Clear communication about these checks is also vital.
