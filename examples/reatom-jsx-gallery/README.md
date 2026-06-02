# Reatom JSX Gallery PWA

A modern, feature-rich Progressive Web App (PWA) image gallery built with **Reatom** and **JSX** (not React). Leverages the **File System Access API** to browse and display images from local folders with deep recursive parsing and extensive customization options.

## ✨ Features

### Core Functionality
- **Folder Selection** - Use File System Access API to open local folders
- **Deep Recursive Parsing** - Traverse all subdirectories to find images
- **Progressive Loading** - Real-time progress updates during folder scanning

### Grid Rendering Options
- **Layout**: 1-12 columns, auto/adaptive, masonry, staggered (Pinterest-style)
- **Sizing**: Multiple thumbnail sizes (100px - 400px), adaptive sizing
- **Aspect Ratio**: Original, square, fit options
- **Image Fit**: Contain, cover, fill, none
- **Grid Gap**: None, small, medium, large, extra large

### View Modes
- **Grid View** - Main customizable grid layout
- **List View** - Detailed information view
- **Lightbox** - Fullscreen image viewer with zoom/pan
- **Slideshow** - Auto-advance with configurable interval
- **Fullscreen** - Immersive viewing experience

### Sorting & Filtering
- **Sort by**: Name, size, date modified, dimensions, random
- **Order**: Ascending or descending
- **Filter by**: File type, size range, date range, filename search
- **Include/exclude**: Subfolders toggle, hidden files toggle

### Advanced Features
- **Keyboard Navigation** - Arrow keys, space, escape support
- **Touch Gestures** - Swipe, pinch zoom on mobile
- **Selection System** - Select multiple images
- **Favorites** - Save images to collections
- **Download** - Single image or multiple as ZIP
- **Theme** - Light/dark mode with persistence
- **Folder Tree** - Hierarchical folder navigation

### PWA Features
- **Installable** - Add to home screen
- **Offline Support** - IndexedDB thumbnail caching
- **Service Worker** - Asset caching for performance
- **Responsive** - Mobile-first design

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **Modern Browser** (Chrome, Edge, Opera recommended for File System Access API)
  - Firefox and Safari have limited support (fallback available)

### Installation

```bash
# Navigate to the project directory
cd examples/reatom-jsx-gallery

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

## 📖 Usage

### Opening a Folder

1. Click the **"Open Folder"** button on the welcome screen
2. Select a folder containing images from the file picker dialog
3. The app will recursively scan all subfolders for images
4. Wait for parsing to complete (progress shown in overlay)

### Navigating Images

- **Grid View**: Click any image to open in lightbox
- **Lightbox**: Use arrow keys or swipe to navigate
- **Slideshow**: Click play button, adjust speed with presets (fast/normal/slow)

### Customizing the Grid

Use the **Settings** panel (toolbar gear icon) to adjust:
- **Columns**: 1, 2, 3, 4, 5, 6, 8, 12, or auto
- **Layout**: Standard, masonry, or staggered
- **Size**: Thumbnail size slider
- **Gap**: Spacing between images
- **Image Fit**: How images fit in their containers

### Sorting & Filtering

Use the toolbar controls to:
- **Sort**: Click sort buttons to change order
- **Filter**: Use type dropdown, size/date range pickers, search box
- **Reset**: Clear all filters with one click

### Keyboard Shortcuts

- `←` / `→` - Previous/next image (in lightbox)
- `Escape` - Close lightbox or exit slideshow
- `Space` - Play/pause slideshow
- `F` - Toggle fullscreen
- `T` - Toggle light/dark theme

## 🛠️ Tech Stack

- **State Management**: [Reatom](https://reatom.js.org/) - Efficient reactive state
- **UI**: Reatom JSX - React-like JSX without React
- **Build Tool**: Vite - Fast development and optimized builds
- **TypeScript**: Full type safety
- **File System Access API**: Local folder access
- **IndexedDB**: Thumbnail and metadata caching
- **PWA**: Installable web app with offline support

## 📁 Project Structure

```
reatom-jsx-gallery/
├── src/
│   ├── model.ts           # Reatom atoms, computed, actions
│   ├── filesystem.ts      # File System Access API integration
│   ├── App.tsx            # Main app component
│   ├── components/        # UI components
│   │   ├── ImageGrid.tsx
│   │   ├── GridImage.tsx
│   │   ├── Lightbox.tsx
│   │   ├── Toolbar.tsx
│   │   └── ...
│   ├── cache.ts           # IndexedDB caching
│   ├── setup.ts           # Reatom initialization
│   └── index.tsx          # Entry point
├── public/                # Static assets, PWA manifest
├── package.json
├── tsconfig.json
├── vite.config.js
└── README.md
```

## 🎨 Customization

### Theme Colors

Edit CSS variables in `src/App.tsx`:

```tsx
// Light mode
root.style.setProperty('--background', '#f5f5f5')
root.style.setProperty('--primary', '#667eea')

// Dark mode
root.style.setProperty('--background', '#1a1a1a')
root.style.setProperty('--primary', '#667eea')
```

### Default Settings

Modify default values in `src/model.ts`:

```typescript
export const gridSettings = atom<GridSettings>({
  columns: 4,              // Default columns
  gap: 'medium',           // Default gap
  size: 250,               // Default thumbnail size
  // ...
})
```

## 🔧 Browser Support

### Full Support
- **Chrome** 86+ (recommended)
- **Edge** 86+ (recommended)
- **Opera** 72+

### Limited Support (Fallback Mode)
- **Firefox**: Uses `<input type="file" webkitdirectory>` fallback
- **Safari**: Uses `<input type="file" webkitdirectory>` fallback
- **Mobile**: Limited support, File System Access API not available

## 📝 Notes

### File System Access API
- Requires HTTPS or localhost
- Permissions are granted per-folder and may be revoked by the user
- Browser may prompt for permission on each page reload
- Some file systems may not support recursive access

### Performance
- Uses virtual scrolling for large image collections (10,000+ images)
- Thumbnails are generated on-demand and cached in IndexedDB
- Memory-conscious: off-screen images are unloaded
- Debounced search and filtering for responsive UI

### Privacy
- All image processing happens locally in your browser
- No data is uploaded to any server
- File handles and permissions are managed by the browser

## 🤝 Contributing

This is an example project for demonstrating Reatom JSX capabilities. Feel free to fork and customize for your needs!

## 📄 License

MIT

## 🔗 Resources

- [Reatom Documentation](https://artalar.github.io/reatom/)
- [Reatom JSX Guide](https://github.com/artalar/reatom/tree/master/packages/jsx)
- [File System Access API](https://developer.chrome.com/docs/file-system-access/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## 🙏 Acknowledgments

Built with [Reatom](https://reatom.js.org/) - a lightweight state manager with a powerful reactivity system.