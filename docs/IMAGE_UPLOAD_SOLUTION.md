# Image Upload Solution - Implementation Guide

## Overview

This document explains the comprehensive image upload solution implemented for the site generator. The solution addresses all your questions about where image uploads should be, how to see which space you're filling, and how the system extracts and uses image data from templates.

## Solution Architecture

### 1. **Image Upload Component** (`ImageSlotUpload.tsx`)

A dedicated component for handling image uploads with the following features:

- **Dual Upload Modes:**
  - 📁 **File Upload**: Direct file upload with drag-and-drop support
  - 🔗 **URL Input**: Enter image URLs directly
  
- **Visual Preview:**
  - Shows a preview of the uploaded/selected image
  - Displays template placeholder if no image is uploaded yet
  - Shows recommended dimensions if available from template

- **User-Friendly Features:**
  - File validation (image types only, max 5MB)
  - Base64 encoding for uploaded files (stored in slotData)
  - Clear visual feedback (green border when filled)
  - Remove image functionality

### 2. **Image Metadata Extraction** (`imageExtractor.ts`)

Utility functions that extract image information from templates:

- **Extracted Metadata:**
  - Current placeholder image URL (`src`)
  - Dimensions (width/height from attributes or styles)
  - Alt text
  - CSS classes
  - Context (surrounding text/headings to help identify location)

- **Usage:**
  - When a template is selected, the system extracts metadata for all image slots
  - This metadata is used to:
    - Show placeholder images in the upload component
    - Display recommended dimensions
    - Provide context about where the image appears

### 3. **Enhanced Template Parser**

Updated template parsing to better detect image slots:

- **Automatic Detection:**
  - Finds all `<img>` tags in uploaded templates
  - Automatically marks them as image slots with `data-slot` attributes
  - Creates descriptive labels based on alt text or src

- **Improved Detection:**
  - Images are detected separately from text content
  - Links (`<a>` tags) are also detected as URL slots
  - Better organization of slot types

### 4. **Wizard Integration**

The image upload is integrated into **Step 3 (Content & Images)** of the wizard:

- **Location:** Right where it should be - in the "Template Content Sections" area
- **Visual Context:** Each image slot shows:
  - The slot label (e.g., "Image 1: Hero Banner")
  - A preview of the current/placeholder image
  - Recommended dimensions if available
  - Context about where it appears on the page

## How It Works

### Step-by-Step Flow:

1. **Template Selection (Step 1):**
   - User selects or uploads a template
   - System parses the template and detects all image slots
   - Image metadata is extracted for each slot

2. **Content & Images (Step 3):**
   - For each image slot, the `ImageSlotUpload` component is displayed
   - User can:
     - Upload a file directly
     - Enter a URL
     - See a preview of their selection
     - See the template placeholder to understand context

3. **Preview (Step 4):**
   - All uploaded images are rendered in their correct positions
   - User can see exactly where each image appears

4. **Export:**
   - Images are included in the exported package
   - Base64 images are converted to files in the `/images` folder

## Key Features

### ✅ Visual Context
- **Preview Panel:** Shows exactly where each image will appear
- **Placeholder Display:** Shows template's original image to understand context
- **Dimension Hints:** Displays recommended dimensions if available

### ✅ Easy Upload
- **File Upload:** Drag-and-drop or click to upload
- **URL Option:** Quick URL input for existing images
- **Validation:** Automatic file type and size validation

### ✅ Clear Organization
- **Separate Section:** Image slots are clearly distinguished from text slots
- **Visual Indicators:** Green borders show which slots are filled
- **Labeled Slots:** Each image has a descriptive label

## Where Images Appear

The system extracts image data from templates so you can see:

1. **During Upload:**
   - Preview panel shows the image slot location
   - Placeholder image from template (if available)
   - Context text (nearby headings/content)

2. **In Preview:**
   - Full page preview with all images in their correct positions
   - Real-time updates as you change images

3. **In Export:**
   - All images properly placed in the final output
   - Organized in `/images` folder

## Technical Details

### Image Storage
- **Uploaded Files:** Converted to base64 data URLs and stored in `slotData`
- **URLs:** Stored as-is in `slotData`
- **Export:** Base64 images are converted to files during export

### Template Parsing
- **Detection:** Automatically finds all `<img>` tags
- **Marking:** Adds `data-slot` attributes to identify slots
- **Metadata:** Extracts dimensions, alt text, and context

### Component Structure
```
ImageSlotUpload
├── Upload Mode Toggle (File/URL)
├── File Upload Area
├── URL Input Field
├── Preview Panel
└── Context Information
```

## Future Enhancements (Optional)

1. **Image Library:** Store commonly used images for reuse
2. **Image Cropping:** Built-in image editor for resizing/cropping
3. **Multiple Formats:** Support for WebP, AVIF optimization
4. **CDN Integration:** Direct upload to CDN services
5. **Visual Template Editor:** Click on template preview to select image slots

## Usage Example

1. **Select Template:** Choose a template with image slots
2. **Navigate to Step 3:** Content & Images section
3. **For Each Image Slot:**
   - See the slot label (e.g., "Image 1: Hero Banner")
   - Click "Upload File" or "Use URL"
   - Upload/enter your image
   - See preview immediately
4. **Preview:** Click "Generate Preview" to see all images in place
5. **Export:** Export with all images properly included

## Summary

✅ **Where:** Step 3 (Content & Images) - right where it makes sense  
✅ **How:** Dedicated upload component with file upload and URL options  
✅ **Visual Context:** Preview panel shows where each image appears  
✅ **Template Extraction:** System extracts image metadata automatically  
✅ **User Experience:** Clear, intuitive interface with visual feedback

The solution provides a complete, user-friendly image upload experience that answers all your questions about where images go and how to see which space you're filling!

