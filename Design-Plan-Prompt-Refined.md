# Refined Design Plan Prompt Template

This template is designed to help you provide clear and comprehensive instructions for generating a design plan for a new web application. Fill in the sections below with as much detail as possible.

---

## 1. Project Overview & Goal

-   **Application Name:** [e.g., Dream-Notions]
-   **Core Purpose:** [Clearly describe what the web app is for, e.g., "noting my dreams and any useful ideas that I might want to journal."]
-   **Desired Output:** [e.g., "Create a detailed design plan: Design-Plan.md"]

## 2. Source Code & Existing Assets

-   **Existing Project Context:** [Describe the nature of any existing code, e.g., "The SRC folder contains all my source files from a web project that I made using figma.make. I would like to be able to recreate this as a new web project."]

-   **Primary Technical Documentation:**
    -   **File Path:** [e.g., `src/figma-make-project/TECHNICAL-FEATURE-DOCUMENTATION-v13.0.0.md`]
    -   **Purpose:** [Explain what this file contains, e.g., "This file contains the PRD for the entire project and lists all the features. Please use this fully in the plan."]

-   **Visual Reference (Screenshots):**
    -   **File Paths:** [e.g., `src/figma-make-project/Screenshot-1 Home-Page.png`, `src/figma-make-project/Screenshot-2 Edit-Form.png`]
    -   **Instructions:** "These files show how the project must look like. Whenever creating a new UI element, please refer to these screenshots for theme, styling, colors, fonts, and overall layout. **The visual replication must be pixel-perfect where possible.** Please confirm in the plan that you can see these files and that you will use them as the single source of truth for visual design."

-   **Core Application Logic Source:**
    -   **File Paths:** [e.g., `/Users/harvey/Documents/Cursor/Project-2-Claude-Setup/src/figma-make-project/App-0to1k-lines.tsx`, etc.]
    -   **Instructions:** "These files contain the core application logic that has been proven to be working. Please read these files thoroughly as they will serve as the primary source for the logic going forward. Please confirm in the plan that you can see these files."

-   **Other Relevant Source Files:**
    -   **Directory/Glob Patterns:** [e.g., `src/figma-make-project/components/`, `src/figma-make-project/hooks/`, etc.]
    -   **Instructions:** "There are many more files in the source subfolder. Please try to make use of all of them where relevant to replicate the existing functionality and structure."

-   **Initial Data Import (Optional but Recommended for Data-Driven Apps):**
    -   **File Path:** [e.g., `Data-Export.md`]
    -   **Instructions:** "This file contains existing data in a specific markdown format. Please ensure that the new application's data structures and import/export mechanisms are compatible with this format. The application should be able to import this data at an early stage to validate data integrity and display. The export facility must also produce data in this exact format."

## 3. Technical Constraints & Preferences

-   **Styling Framework:** "For styling, use a stable and widely adopted version of Tailwind CSS. **Please propose a specific stable version (e.g., 3.3.3) and confirm it before proceeding.**"
-   **Backend & Authentication:** "Do the Firebase database and Google remote authentication at the end of the development process."
-   **Deployment:** "This project must be deployable via Netlify."

## 4. Development Process & Expectations

-   **Step-by-Step Plan:** "Create a detailed, step-by-step plan. Sequence it so that the graphical setup and user interface are done at a starting phase. Then do the coding as subsequent phases."
-   **Granular Review:** "Every time a new user-facing UI element is created or a significant functional change is made, **please stop and ask me to inspect it before proceeding to the next step.**"
-   **Proactive Error Checking:** "After each significant development step (e.g., after creating a new UI element or implementing a feature), **please perform an `npm run build` (or equivalent project-specific build/test command) to check for errors yourself before asking me for review.** Report any errors you encounter and resolve them before proceeding."
-   **Git Checkpoints:** "In your plan, also prompt me to do a `git push` at stages that you think would be worthwhile (e.g., after major phases or stable checkpoints)."
-   **AI Context Management:** "In your plan, also suggest if the AI context memory needs to be cleared because some AI memories are limited and I want the AI to be focused and not hallucinate."

## 5. Initial Confirmation

-   "Have you read all the source files as specified? If so, are you ready to proceed to write the Design Plan?"
