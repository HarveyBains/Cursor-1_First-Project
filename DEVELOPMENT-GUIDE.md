# Dream-Notions Development Guide

## 🎯 Development Standards

### Code Requirements
- **TypeScript**: Strict typing, explicit annotations
- **Components**: Functional components with hooks
- **UI**: SHAD-CN components from `@/components/ui/`
- **Errors**: Handle Firebase errors with try/catch
- **Testing**: Run `npm run build` to validate changes
- **Git**: User handles version control

### Quality Checklist
- ✅ TypeScript errors resolved
- ✅ Build succeeds (`npm run build`)
- ✅ SHAD-CN components used where possible

## 🔧 Architecture

### Data Flow
- **Dreams**: `DreamEntry[]` → Firebase (auth) / localStorage (unauth)
- **Notepad**: `Tab[]` → Firebase (auth) / localStorage (unauth)  
- **Auth**: Google Firebase → Auto-migration on sign-in

### Key Components
- `App.tsx` - Main state management
- `NotepadDialog.tsx` - Multi-tab interface
- `src/components/ui/` - SHAD-CN component library
- `services/firestore-service.ts` - Data operations

### Available UI Components
**Used**: button, avatar, badge, separator, dialog, scroll-area, tabs, textarea, card, collapsible, context-menu, alert
**Available**: Many additional SHAD-CN components ready for use

## 🔍 Debug Panel
- Authentication status & data source
- Dream count & sync status  
- Real-time logs & Firebase testing

## 📝 Workflow
1. Read `CLAUDE.md` before changes
2. Use SHAD-CN components for new UI
3. Run `npm run build` after changes
4. User handles git commits

## 🚀 Technical Notes
- **Dev server**: `npm run dev` (port 5173)
- **Build validation**: `npm run build` (required for deployment)
- **Firebase config**: `firebase-config.ts`
- **Styling**: Tailwind CSS + SHAD-CN tokens