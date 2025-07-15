# Project Context

## Overview
A Dream-Notions web application for noting and organizing dreams using:
- React/TypeScript 
- Tailwind CSS v3.3.3 (stable)
- SHAD-CN components library
- Vite
- Firebase integration

## Key Documents
- **Design-Plan-Prompt.md** - Original project requirements and vision
- **Current-State-PRD.md** - Current features and technical stack
- **DEVELOPMENT-GUIDE.md** - Development standards, coding patterns, SHAD-CN usage

## Structure
- `dream-notions-app/` - Main application
- `dream-notions-app/src/components/ui/` - SHAD-CN components
- `dream-notions-app/src/services/` - Firebase operations
- `dream-notions-app/src/types/` - TypeScript definitions

## Features
- Dark theme, Firebase auth, local/cloud data sync
- Dream management with hierarchical tags
- Multi-tab notepad, markdown import/export
- SHAD-CN component library

## Notes
- Always read CLAUDE.md on session startup
- Always run, 'npm run build' after every UI change to check for application errors
- If port 5173 is in use then restart it.