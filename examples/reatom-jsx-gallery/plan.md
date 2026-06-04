# Reatom JSX Gallery PWA - Implementation Plan

**Status**: `ready`

## Problem Statement

Create a modern, feature-rich Progressive Web App (PWA) image gallery using Reatom with JSX (not React) that leverages the File System Access API to browse and display images from local folders. The app should support deep recursive folder parsing and offer extensive customization options for rendering images in a grid layout.

## Questions Resolved

### Q: Should the app support image editing/manipulation?

A: No, focus on viewing and browsing features only. Image manipulation is out of scope.

### Q: Should the app cache images for offline access?

A: No, images are local and accessed directly. PWA features for offline network access (no caching of images).

### Q: Should the app support exporting/browsing multiple folders simultaneously?

A: Start with single folder support, design for extensibility to add multi-folder later.

## Edge Cases & Considerations

- [ ] **Large folder structures** → Store each folder in reatomLinkedList for efficient rendering, for filtering compute style `display` property for each image based on the filter
- [ ] **Memory constraints** → Use reatomLinkedList for each folder to manage large lists efficiently, but no virtual scrolling - rely on native browser rendering
- [ ] **Non-image files** → Filter based on MIME types (image/\*) and file extensions (.jpg, .png, .gif, .webp, .svg, .avif, .bmp)
- [ ] **File System Access API browser support** → Provide graceful alert for unsupported browsers
- [ ] **Permission revocation** → Handle permission errors gracefully, re-prompt for access when needed
- [ ] **Folder permission limits** → Some browsers restrict deep recursive access, implement chunked traversal with permission prompts
- [ ] **Many images in single folder** → Use reatomLinkedList to efficiently manage and render large numbers of images without virtualization
- [ ] **Mixed image orientations** → Detect and handle EXIF rotation data
- [ ] **High-resolution images** → Native img tag handles these fine, no thumbnail caching needed
- [ ] **Duplicate filenames** → Include full path in unique identifier, handle gracefully
- [ ] **File system changes during browsing** → Poll for changes, show "folder modified" indicator with refresh option
- [ ] **Offline PWA access** → Workbox service worker for asset caching, app should work without network connection after first load

## Relevant Context

### Required Documentation

Should be included in the context of worked agent!

- [`docs/src/content/docs/summary.md`](docs/src/content/docs/summary.md) - Complete Reatom API guide (atoms, computed, actions, async, persistence, forms, lifecycle)
- [`packages/jsx/README.md`](packages/jsx/README.md) - Reatom JSX reference (components, props, models, styles, TypeScript)

### File System Access API Resources

- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API - MDN reference

### PWA Resources

- https://web.dev/learn/pwa/workbox - Workbox for PWA service workers
- https://developer.chrome.com/docs/workbox/ - Workbox documentation
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps - MDN PWA guide

### Example Projects

- [`examples/reatom-jsx-xo/`](examples/reatom-jsx-xo/) - Reatom JSX project structure reference

## Feature Specifications

### Core Features

1. **Folder Selection & Access**
   - Use `showDirectoryPicker()` to open folder dialog
   - Request and manage directory handle permissions
   - Display folder name and path breadcrumb
   - Support re-opening previously accessed folders (if permissions persist)

2. **Deep Recursive Folder Parsing**
   - Traverse all subdirectories recursively
   - Collect all image files with metadata (name, path, size, type, lastModified)
   - Show parsing progress with file count indicator
   - Support parallel file reading for performance

3. **Image Grid Rendering Options** (MANY options!)

   **Layout Options:**
   - Grid columns: 1, 2, 3, 4, 5, 6, 8, 12, adaptive/auto
   - Grid gap: none, small, medium, large, extra large
   - Masonry layout support
   - Staggered grid (Pinterest-style)
   - Compact vs spacious layout

   **Image Sizing Options:**
   - Thumbnail sizes: small (100px), medium (200px), large (300px), XL (400px), adaptive
   - Aspect ratio: fit, fill, original, square
   - Image fit: contain, cover, fill, none
   - Uniform vs variable sizes based on image dimensions

   **Sort Options:**
   - By name (A-Z, Z-A)
   - By size (smallest first, largest first)
   - By date modified (newest first, oldest first)
   - By dimensions (width, height, area)
   - By type
   - Random shuffle
   - Custom drag-and-drop order

   **Filter Options:**
   - By file type (JPG, PNG, GIF, WebP, SVG, etc.)
   - By file size range
   - By date range
   - By dimensions range
   - Search by filename
   - Include/exclude subfolders toggle
   - Show/hide hidden files

4. **View Modes**
   - Grid view (default, customizable)
   - List view (detailed info)
   - Single image view (carousel/slideshow)
   - Fullscreen lightbox mode
   - Focus mode (hide UI, immersive viewing)

5. **Lightbox Features**
   - Keyboard navigation (arrow keys, escape)
   - Mouse/touch gestures (swipe, pinch zoom)
   - Image zoom (in/out, fit to screen)
   - Pan while zoomed
   - Previous/next image buttons
   - Thumbnail strip at bottom
   - Image metadata panel
   - Download current image button
   - Open in external viewer option

6. **Slideshow Mode**
   - Auto-advance with configurable interval (1s, 3s, 5s, 10s, 30s)
   - Play/pause controls
   - Progress indicator
   - Random order option
   - Loop vs stop at end

7. **Folder Navigation**
   - Breadcrumb navigation
   - Folder tree sidebar (collapsible)
   - Quick jump to parent folder
   - Folder count display (images per folder)
   - Go to specific folder by path

8. **Image Information Display**
   - Filename and full path
   - File size (formatted)
   - Dimensions (width × height)
   - File type/MIME type
   - Last modified date
   - EXIF data (if available): camera, date taken, GPS, etc.

9. **Selection & Actions**
   - Select multiple images (checkboxes, drag-select)
   - Select all / deselect all
   - Download selected images as ZIP
   - Open selected in external app
   - Copy image to clipboard
   - Create favorites/collections (persistent)

10. **UI Customization**
    - Light/dark mode toggle
    - Accent color selection
    - Compact vs spacious UI
    - Show/hide image names
    - Show/hide file sizes
    - Custom grid presets (save/load)

11. **Performance Features**
    - Lazy image loading (img attribute)
    - Thumbnail generation and caching in IndexedDB
    - Debounced search and filtering
    - Progressive image loading (blur-up technique)

12. **PWA Features**
    - Install to home screen
    - Offline support (cached thumbnails, metadata)
    - Background sync for thumbnail generation
    - Service worker for asset caching
    - Manifest with icons and theme colors

### Technical Architecture

1. **State Management (Reatom)**
   - `folderHandle` atom - Current directory handle
   - `foldersList` atom - Hierarchical folder structure, each folder using reatomLinkedList for images
   - `viewMode` atom - Current view mode (grid, list, lightbox, slideshow)
   - `gridSettings` atom - Grid columns, gap, size, layout type
   - `sortSettings` atom - Sort field and order
   - `filterSettings` atom - Active filters
   - `selectedImages` atom - Set of selected image IDs
   - `currentImageIndex` atom - Index in lightbox slideshow
   - `theme` atom - UI theme preference
   - `uiPreferences` atom - Various UI settings
   - `parsingProgress` atom - Current parsing status and progress

2. **Actions**
   - `openFolder` - Trigger directory picker
   - `parseFolder` - Recursive folder parsing with progress
   - `cancelParsing` - Stop ongoing parse
   - `selectImage` - Toggle image selection
   - `selectAllImages` - Select all visible images
   - `clearSelection` - Clear all selections
   - `setViewMode` - Change view mode
   - `updateGridSettings` - Update grid layout options
   - `setSortOption` - Change sort criteria
   - `applyFilter` - Add/update filter
   - `clearFilters` - Remove all filters
   - `openLightbox` - Open lightbox at specific image
   - `navigateLightbox` - Move to next/previous image
   - `closeLightbox` - Exit lightbox mode
   - `startSlideshow` - Begin slideshow
   - `pauseSlideshow` - Pause slideshow
   - `setSlideshowSpeed` - Change slideshow interval
   - `downloadImage` - Download single image
   - `downloadSelected` - Download selected as ZIP
   - `toggleFavorite` - Add/remove image from favorites

3. **Effects (Async Operations)**
   - `loadFolderImages` - Async folder reading and parsing
   - `loadImageMetadata` - Extract EXIF and other metadata
   - `downloadMultipleImages` - ZIP creation and download
   - `savePreferences` - Persist settings to localStorage

4. **Components Structure**
   - `App` - Root component
   - `FolderSelector` - Button to open folder picker
   - `FolderTree` - Sidebar folder navigation
   - `ImageGrid` - Main grid view component
   - `GridImage` - Individual image card
   - `Lightbox` - Fullscreen image viewer
   - `SlideshowControls` - Slideshow playback controls
   - `Toolbar` - Main action toolbar
   - `SettingsPanel` - Grid and view settings
   - `FilterPanel` - Filter controls
   - `SortPanel` - Sort options
   - `ImageInfoPanel` - Image metadata display
   - `ProgressBar` - Parsing progress indicator
   - `ThemeToggle` - Light/dark mode switch
   - `BreadcrumbNav` - Folder path navigation

## Implementation Steps

- [ ] **Step 1**: Initialize project structure → `reatom-jsx-gallery/`
  - Depends on: none
  - Acceptance: Project directory created with package.json, tsconfig.json, vite.config.js matching reatom-jsx-xo pattern

- [ ] **Step 2**: Set up Reatom core state model → `src/model.ts`
  - Depends on: Step 1
  - Acceptance: Core atoms defined for folder handle, images list, view modes, settings using Reatom primitives (atom, computed, action, effect)

- [ ] **Step 3**: Implement File System Access API integration → `src/filesystem.ts`
  - Depends on: Step 2
  - Acceptance: Functions for showDirectoryPicker, recursive folder traversal, file reading with error handling

- [ ] **Step 4**: Create folder parsing logic with progress → `src/parsing.ts`
  - Depends on: Step 3
  - Acceptance: Async folder parsing function that updates parsingProgress atom, handles large folders with chunked processing

- [ ] **Step 5**: Build main App component and layout → `src/App.tsx`
  - Depends on: Step 2
  - Acceptance: Root App component with layout shell, folder selector button, and conditional views for empty/loaded states

- [ ] **Step 6**: Implement ImageGrid component with reatomLinkedList → `src/components/ImageGrid.tsx`
  - Depends on: Step 2, Step 5
  - Acceptance: Grid component that renders images from reatomLinkedList per folder, uses computed `display` style for filtering, lazy loading with native img tag

- [ ] **Step 7**: Create GridImage card component → `src/components/GridImage.tsx`
  - Depends on: Step 6
  - Acceptance: Individual image card with thumbnail, filename, selection checkbox, click handlers

- [ ] **Step 8**: Build Lightbox component → `src/components/Lightbox.tsx`
  - Depends on: Step 2, Step 5
  - Acceptance: Fullscreen image viewer with keyboard navigation, zoom/pan, next/prev controls, close on escape

- [ ] **Step 9**: Implement Slideshow functionality → `src/components/Slideshow.tsx`
  - Depends on: Step 8
  - Acceptance: Slideshow controls with play/pause, interval adjustment, progress indicator

- [ ] **Step 10**: Create Toolbar with actions → `src/components/Toolbar.tsx`
  - Depends on: Step 2
  - Acceptance: Main toolbar with view mode toggle, selection actions, download, settings button

- [ ] **Step 11**: Build SettingsPanel for grid customization → `src/components/SettingsPanel.tsx`
  - Depends on: Step 2
  - Acceptance: Panel with grid columns slider, gap options, size options, layout type selector

- [ ] **Step 12**: Implement FilterPanel → `src/components/FilterPanel.tsx`
  - Depends on: Step 2
  - Acceptance: Filter controls for file type, size range, date range, search input

- [ ] **Step 13**: Create SortPanel component → `src/components/SortPanel.tsx`
  - Depends on: Step 2
  - Acceptance: Sort dropdown/buttons for name, size, date, dimensions with ascending/descending toggle

- [ ] **Step 14**: Build FolderTree sidebar → `src/components/FolderTree.tsx`
  - Depends on: Step 2
  - Acceptance: Collapsible folder tree with counts, click to filter by folder, breadcrumb navigation

- [ ] **Step 15**: Implement ImageInfoPanel → `src/components/ImageInfoPanel.tsx`
  - Depends on: Step 2
  - Acceptance: Panel showing metadata for selected/current image (size, dimensions, EXIF data)

- [ ] **Step 16**: Create ProgressBar component → `src/components/ProgressBar.tsx`
  - Depends on: Step 2
  - Acceptance: Progress bar showing parsing status with file count, percentage, and cancel button

- [ ] **Step 18**: Implement theme system → `src/components/ThemeToggle.tsx` + `src/theme.ts`
  - Depends on: Step 2
  - Acceptance: Light/dark mode toggle with persistence to localStorage, CSS-in-JS styles for both themes

- [ ] **Step 18**: Add PWA manifest and Workbox service worker → `public/manifest.json`, `public/sw.js`, `workbox.config.js`
  - Depends on: Step 1
  - Acceptance: PWA manifest with icons, Workbox service worker for asset caching (not images), offline support for network resources

- [ ] **Step 19**: Create responsive styles and layout → `src/styles.ts`, `src/components/*.tsx`
  - Depends on: All previous steps
  - Acceptance: CSS-in-JS styles using Reatom's css prop, mobile-first responsive design, smooth animations

- [ ] **Step 20**: Implement favorites/collections system → `src/favorites.ts`
  - Depends on: Step 2
  - Acceptance: Favorites persistence in localStorage, add/remove from favorites action, favorites view filter

- [ ] **Step 21**: Add keyboard shortcuts and gestures → `src/shortcuts.ts`, `src/gestures.ts`
  - Depends on: Step 8
  - Acceptance: Keyboard navigation (arrows, space, escape), touch gestures (swipe, pinch) for lightbox

- [ ] **Step 22**: Implement download functionality (single and ZIP) → `src/download.ts`
  - Depends on: Step 2
  - Acceptance: Single image download, ZIP creation for multiple selected images

- [ ] **Step 23**: Add error handling and user notifications → `src/errors.ts`, `src/notifications.tsx`
  - Depends on: All steps with async operations
  - Acceptance: Error boundaries, toast notifications for errors, loading states, success messages

- [ ] **Step 24**: Polish and optimization → All files
  - Depends on: All previous steps
  - Acceptance: Performance optimizations, accessibility improvements, final styling tweaks, code cleanup

## Testing Strategy

**Skipping tests for now** - Testing will be handled manually during development. Unit tests, integration tests, and automated testing suites are deferred to a future iteration.

## Notes

None yet - implementation notes and discoveries will be added here during development.
