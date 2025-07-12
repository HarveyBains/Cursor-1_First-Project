# Dream-Notions Development Guide

## 🎯 User Preferences & AI Instructions

### Testing & Quality Assurance
- **ALWAYS test modifications by running `npm run build` before asking the user to inspect**
- Check for TypeScript errors, linter warnings, and build failures
- Fix all issues before presenting changes to the user
- If build fails, debug and resolve before proceeding

### Code Style & Patterns
- Use TypeScript with strict typing
- Prefer explicit type annotations over implicit `any`
- Use functional components with hooks
- Always handle Firebase errors with try/catch blocks
- Use proper TypeScript interfaces for all data structures

### Git & Version Control
- **User prefers to handle version control themselves**
- Do NOT suggest git commits or version control commands
- Focus on code implementation and testing

## 🏗️ Current Project State

### Multi-Tab Notepad Implementation
- **Status**: Partially implemented with TypeScript errors
- **Issue**: Missing Firestore methods and state inconsistencies
- **Current State**: 
  - `notepadTabs` state exists but old `notepadContent` references remain
  - Firestore service missing `saveNotepadTabs`, `getNotepadTabs`, `subscribeToNotepadTabs` methods
  - NotepadDialog component updated for multi-tab support

### Critical Issues to Fix
1. **Missing Firestore Methods**: Need to implement notepad tab sync methods
2. **State Inconsistencies**: Remove all `notepadContent` references, use `notepadTabs` consistently
3. **Type Errors**: Fix implicit `any` types in tab mapping functions
4. **Build Errors**: Current code has multiple TypeScript compilation errors

### Tab ID Generation
- Implemented `generateUniqueTabId()` and `deduplicateTabs()` functions
- Uses crypto-based unique ID generation to prevent React duplicate key errors
- Applied to localStorage loading to ensure unique IDs

## 🔧 Technical Architecture

### State Management
- **Dreams**: Array of `DreamEntry` objects with Firebase/localStorage sync
- **Notepad**: Array of `Tab` objects (id, name, content, isDeletable)
- **Authentication**: Google Auth with Firebase
- **Data Sync**: Firebase for authenticated users, localStorage for unauthenticated

### Firebase Integration
- Firestore service handles dreams and notepad data
- Real-time subscriptions for data sync
- Automatic migration from localStorage to Firebase on sign-in

### Component Structure
- `App.tsx`: Main application with state management
- `NotepadDialog.tsx`: Multi-tab notepad interface
- `FirestoreService`: Firebase data operations
- Various utility components for dreams, imports, exports

## 🚨 Current Build Errors

### Missing Firestore Methods
```typescript
// These methods need to be implemented in firestore-service.ts:
- saveNotepadTabs(tabs: Tab[], userId: string): Promise<void>
- getNotepadTabs(userId: string): Promise<Tab[]>
- subscribeToNotepadTabs(userId: string, callback: (tabs: Tab[]) => void): Unsubscribe
```

### State Reference Errors
```typescript
// Remove these old references:
- setNotepadContent() // Should use setNotepadTabs()
- notepadContent // Should use notepadTabs
- saveNotepadContent() // Should use saveNotepadTabs()
```

### Type Errors
```typescript
// Fix implicit any types:
- Parameter 't' in tab mapping functions
- Parameter 'tab' and 'index' in forEach callbacks
```

## 📋 Next Steps

### Immediate Fixes Required
1. **Implement missing Firestore methods** in `firestore-service.ts`
2. **Remove all `notepadContent` references** from `App.tsx`
3. **Update NotepadDialog usage** to use new tab-based API
4. **Fix type annotations** for all tab-related functions
5. **Test build** with `npm run build` to verify fixes

### Feature Completion
1. **Multi-tab notepad** with add/rename/delete functionality
2. **Remote sync** for authenticated users
3. **Local storage** for unauthenticated users
4. **Unique tab IDs** to prevent React key conflicts

## 🎨 UI/UX Requirements

### Notepad Features
- Add new tabs with unique names
- Rename tabs (right-click or button)
- Delete tabs (except first tab which is not deletable)
- Each tab has its own Save and Delete buttons
- All changes only persist when Save is clicked
- Tab switching without auto-save

### Data Persistence
- **Authenticated users**: Save to Firebase with real-time sync
- **Unauthenticated users**: Save to localStorage
- **Migration**: Local data moves to Firebase on sign-in

## 🔍 Debugging Tools

### Debug Panel Features
- User authentication status
- Data source (Firebase vs localStorage)
- Dream count and sync status
- Real-time debug logs
- Firebase connection testing
- Notepad sync testing

### Common Issues
- Duplicate tab IDs causing React key errors
- Firebase permission issues
- Local storage vs Firebase sync conflicts
- TypeScript compilation errors

## 📝 Development Workflow

1. **Before making changes**: Understand current state and requirements
2. **During development**: Test frequently with `npm run build`
3. **After changes**: Verify no TypeScript errors and build success
4. **Before asking user**: Ensure all issues are resolved

## 🚀 Deployment Notes

- Vite development server runs on port 5173
- Firebase configuration in `firebase-config.ts`
- Environment variables for Firebase keys
- Build output in `dist/` directory

---

**Last Updated**: Current session
**Status**: Multi-tab notepad implementation in progress with TypeScript errors
**Priority**: Fix build errors before proceeding with features 