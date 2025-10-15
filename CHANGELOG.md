# YouTube Pinner - Changelog

## [1.2.0] - 2024-12-19

### Added
- **Pin Buttons on Homepage Videos**: Added 📌 buttons to all homepage videos for instant pinning
  - Pin buttons appear on top-right of video thumbnails (except already pinned videos)
  - Smooth animation and hover effects for better UX
  - Automatically detects and skips already pinned videos
  - Works with all YouTube video layouts (grid, list, compact views)
  - Enhanced dynamic detection with multiple fallback systems for infinite scroll
  - Scroll event listener detects when new videos load as users scroll
  - Periodic checking every second for 30 seconds to catch missed videos
  - Improved MutationObserver with better video element detection

- **Unpin Button on Homepage**: Added ❌ button on top-right of each pinned video for easy removal
  - Hover effect with red background for better UX
  - Click to unpin directly from homepage without opening popup
  - Automatic re-rendering of pinned videos section after unpinning
  - Prevents event bubbling to avoid accidental video clicks

- **Unlimited Pinned Videos**: Removed 3-video limit, now supports unlimited pinned videos
  - No more automatic removal of oldest videos
  - Users can pin as many videos as they want
  - Updated manifest description to reflect unlimited capability

### Fixed
- **Critical Bug Fix**: Resolved duplication issue where "Your Pinned Videos" section appeared twice on YouTube homepage
  - Added render locking mechanism to prevent simultaneous renders
  - Improved duplicate detection using `querySelectorAll()` to remove ALL instances
  - Added debouncing to MutationObserver (500ms delay) to reduce excessive re-renders
  - Reduced fallback interval frequency from 3s to 5s
  - Enhanced error handling and logging throughout the extension

- **Pin Button Loading Issue**: Implemented ultra-aggressive pin button detection strategy
  - Added continuous monitoring system that checks every second for up to 100 seconds
  - Enhanced `waitForVideoElements()` with comprehensive element checking and detailed logging
  - Implemented 10 retry attempts at intervals from 200ms to 5s for immediate coverage
  - Added automatic monitoring restart on video page navigation
  - Improved MutationObserver with faster response (100ms debounce) and more element detection
  - Added comprehensive logging for debugging element detection and button insertion
  - Automatic cleanup when button is found or page navigation occurs

- **Homepage Navigation Issue**: Fixed pinned videos not showing when navigating from video page to homepage
  - Integrated homepage functionality into content script for SPA navigation support
  - Added homepage detection and rendering logic to handle all navigation scenarios
  - Enhanced URL change detection to handle both video page and homepage transitions
  - Improved MutationObserver to detect both video page and homepage element changes

### Technical Improvements
- Added `isRendering` flag to prevent race conditions in homepage.js
- Improved error logging in content.js and popup.js for better debugging
- Better error handling for extension context invalidation scenarios

---

## [1.0.0] - Initial Release

### Features
- Pin up to 3 YouTube videos from any video page
- Display pinned videos in a dedicated section on YouTube homepage
- Popup interface to manage pinned videos
- Unpin individual videos or clear all pins
- Automatic thumbnail and title extraction
- Responsive design matching YouTube's dark theme

### Technical Details
- Chrome Extension Manifest V3
- Uses Chrome Storage Sync API for cross-device sync
- Content script injection for video pages and homepage
- Service worker for background tasks
- MutationObserver for dynamic content detection

---

## Known Issues
- Extension requires page reload if context becomes invalidated

## Planned Improvements
- Add keyboard shortcuts for pinning
- Better integration with YouTube's UI
- Add drag-and-drop reordering of pinned videos
- Add categories/tags for organizing pinned videos
