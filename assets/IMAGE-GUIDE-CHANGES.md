Styling note: overlay & brightness tweak

I adjusted the hero background CSS to avoid the profile photo becoming too dark in dark mode or too washed-out in light mode. The changes made:

- Reduced the intensity of the radial overlay so it tints the photo rather than overwhelming it.
- Increased the profile image opacity and used gentler brightness/saturation values for both light and dark modes.

If you still see issues:
- Prefer a profile image with a transparent background (PNG/WebP) or a mid-tone background rather than pure white/black.
- Test in both light and dark modes and on mobile. The responsive CSS was tuned to avoid extreme darkening on small screens.

If you'd like a different visual (strong vignette, full-bleed dark background, or no overlay), tell me which and I can update the stylesheet accordingly.