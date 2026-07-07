# FreshArena Website

This directory contains the public-facing website for the FreshArena project.

## Contents

- `index.html` - Main landing page with project overview, quick start guide, and example results

## Deployment

The website is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. See `.github/workflows/deploy-website.yml` for the deployment configuration.

## Local Development

To view the website locally:

```bash
# Using Python 3
cd website
python -m http.server 8000

# Or using Node.js
npx http-server website

# Then visit http://localhost:8000
```

## Design

The website uses a modern, clean design with:
- Responsive layout that works on mobile and desktop
- Gradient header and call-to-action buttons
- Feature cards with hover effects
- Code examples with syntax highlighting
- Professional color scheme using purple/violet tones

## Future Enhancements

Potential improvements for future iterations:
- Add more detailed documentation pages
- Include interactive examples
- Add blog/news section
- Include contribution guide
- Add API documentation
- Include roadmap visualization
