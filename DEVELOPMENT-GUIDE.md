# Dream-Notions Development Guide

## 🎯 User Preferences & AI Instructions

### Testing & Quality Assurance
- Check for TypeScript errors, linter warnings, and build failures by running 'npm run dev' command
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

1. **Before making changes**: Understand read the claude.md file
2. **During development**: Ask if the user wants to do a git save before implementing code modification.
3. **After changes**: Verify no TypeScript errors and build success
4. **UI Change Testing**: After implementing a modification, do the following steps to test the code.
   - Run `npm run dev` to verify startup without web server errors
   - Run `npm run build` to check for TypeScript/build errors
4.1 Record Testing - This step is optional. Don't do it unless the user specifically says so.
   - Create a test dream record to verify UI functionality
   - Edit the test record to check edit functionality works correctly
   - Delete the test record to verify deletion works properly
   - Check debug logs for any errors during CRUD operations
 


## 🚀 Deployment Notes

- Vite development server runs on port 5173
- Firebase configuration in `firebase-config.ts`
- Environment variables for Firebase keys
- Build output in `dist/` directory

---

