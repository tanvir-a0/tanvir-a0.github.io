# Assets Folder Structure

This folder contains all media assets for the website.

## 📁 Directory Organization:

### `/images/`
- **`/projects/ai-robot/`** - AI Robot project photos
- **`/projects/drone/`** - Drone project photos
- **`/projects/smart-home/`** - Smart Home project photos
- Place profile pictures, logos, and general images here

### `/videos/`
- Demo videos for projects
- Recommended formats: MP4, WebM
- Keep file sizes optimized for web (compress if needed)

### `/models/`
- 3D models for interactive displays
- Recommended formats: .glb, .gltf (for Three.js)
- Also supports: .obj, .fbx

### `/icons/`
- Favicon and app icons
- Social media preview images

## 💡 Tips:
1. **Image naming**: Use lowercase with hyphens (e.g., `flight-test-1.jpg`)
2. **Optimize images**: Compress before uploading to reduce load times
3. **Formats**: 
   - Photos: JPG/JPEG
   - Graphics/logos: PNG or SVG
   - Videos: MP4 (H.264)
   - 3D Models: GLB (most efficient)

## 🔗 Usage Example:
```html
<!-- In your HTML files -->
<img src="assets/images/projects/ai-robot/hero.jpg" alt="AI Robot">
<video src="assets/videos/drone-demo.mp4" controls></video>
```

Happy creating! 🚀
