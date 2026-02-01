const Tesseract = require('tesseract.js');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Automatically processes a logo by detecting text, separating icon from text,
 * and creating a clean vertical layout (icon above, text below)
 * @param {string} filePath - Path to the original logo file
 * @returns {Promise<string>} - Path to the processed logo file
 */
async function processLogo(filePath) {
  try {
    console.log('Starting logo processing for:', filePath);
    
    // Ensure processed directory exists
    const processedDir = path.join(process.cwd(), 'processed');
    await fs.mkdir(processedDir, { recursive: true });
    
    // Generate output filename
    const originalName = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(processedDir, `${originalName}_processed.png`);
    
    // Load and process the image
    const image = await Jimp.read(filePath);
    const { width, height } = image.bitmap;
    
    console.log(`Original image dimensions: ${width}x${height}`);
    
    // Run OCR to detect text areas
    const { data: { words } } = await Tesseract.recognize(filePath, 'eng', {
      logger: m => console.log('OCR Progress:', m)
    });
    
    console.log(`Detected ${words.length} text elements`);
    
    // If no text detected, return original image
    if (words.length === 0) {
      console.log('No text detected, returning original image');
      await image.writeAsync(outputPath);
      return outputPath;
    }
    
    // Find text bounding box
    const textBounds = findTextBounds(words);
    console.log('Text bounds:', textBounds);
    console.log('Image dimensions:', { width, height });
    console.log('Text area percentage:', {
      xPercent: (textBounds.x / width * 100).toFixed(1),
      yPercent: (textBounds.y / height * 100).toFixed(1),
      widthPercent: (textBounds.width / width * 100).toFixed(1),
      heightPercent: (textBounds.height / height * 100).toFixed(1)
    });
    
    // Create icon (original image with text area made transparent)
    const iconImage = image.clone();
    if (textBounds.width > 0 && textBounds.height > 0) {
      // Make the entire text area transparent to remove text from icon
      iconImage.scan(textBounds.x, textBounds.y, textBounds.width, textBounds.height, function (x, y, idx) {
        // Make the entire text bounding box transparent
        this.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
      });
    }
    
    // Extract and process text
    const textImage = await extractTextRegion(image, textBounds);
    const processedTextImage = await processTextImage(textImage, iconImage.getWidth(), image);
    
    // Combine icon and text vertically
    const finalImage = await combineImagesVertically(iconImage, processedTextImage);
    
    // Save the processed logo
    await finalImage.writeAsync(outputPath);
    console.log('Processed logo saved to:', outputPath);
    
    return outputPath;
    
  } catch (error) {
    console.error('Error processing logo:', error);
    // Return original file path if processing fails
    return filePath;
  }
}

/**
 * Find the bounding box that contains all detected text
 * @param {Array} words - Array of detected words from Tesseract
 * @returns {Object} - Bounding box coordinates and dimensions
 */
function findTextBounds(words) {
  if (words.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  words.forEach(word => {
    if (word.bbox.x0 < minX) minX = word.bbox.x0;
    if (word.bbox.y0 < minY) minY = word.bbox.y0;
    if (word.bbox.x1 > maxX) maxX = word.bbox.x1;
    if (word.bbox.y1 > maxY) maxY = word.bbox.y1;
  });
  
  // Add some padding around the text
  const padding = 5;
  return {
    x: Math.max(0, Math.floor(minX) - padding),
    y: Math.max(0, Math.floor(minY) - padding),
    width: Math.floor(maxX - minX) + (padding * 2),
    height: Math.floor(maxY - minY) + (padding * 2)
  };
}

/**
 * Extract the text region from the original image
 * @param {Jimp} image - Original image
 * @param {Object} textBounds - Text bounding box
 * @returns {Promise<Jimp>} - Cropped text image
 */
async function extractTextRegion(image, textBounds) {
  if (textBounds.width <= 0 || textBounds.height <= 0) {
    // Return a small transparent image if no text bounds
    return new Jimp(1, 1, 0x00000000);
  }
  
  return image.clone().crop(textBounds.x, textBounds.y, textBounds.width, textBounds.height);
}

/**
 * Process the text image to match icon width and clean it up
 * @param {Jimp} textImage - Cropped text image
 * @param {number} targetWidth - Target width to match icon
 * @param {Jimp} originalImage - Original image for color reference
 * @returns {Promise<Jimp>} - Processed text image
 */
async function processTextImage(textImage, targetWidth, originalImage = null) {
  const { width, height } = textImage.bitmap;
  
  if (width === 0 || height === 0) {
    return new Jimp(1, 1, 0x00000000);
  }
  
  // Calculate new height to maintain aspect ratio
  const aspectRatio = height / width;
  const newHeight = Math.floor(targetWidth * aspectRatio);
  
  // Resize text to match icon width
  const resizedText = textImage.resize(targetWidth, newHeight);
  
  // Clean up the text (remove background, preserve colors)
  const cleanedText = await cleanTextImage(resizedText);
  
  return cleanedText;
}

/**
 * Clean up the text image by removing background while preserving original colors
 * @param {Jimp} textImage - Text image to clean
 * @returns {Promise<Jimp>} - Cleaned text image
 */
async function cleanTextImage(textImage) {
  const { width, height } = textImage.bitmap;
  const cleaned = textImage.clone();
  
  // Process each pixel
  cleaned.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];
    
    // Calculate brightness
    const brightness = (r + g + b) / 3;
    
    // If pixel is very bright (likely background), make it transparent
    if (brightness > 220 && a > 0) {
      this.bitmap.data[idx + 3] = 0; // Make transparent
    } else if (a > 0) {
      // Preserve original colors but ensure opacity
      this.bitmap.data[idx + 3] = 255; // A - make opaque
    }
  });
  
  return cleaned;
}

/**
 * Combine icon and text images vertically with proper spacing
 * @param {Jimp} iconImage - Icon image (top)
 * @param {Jimp} textImage - Text image (bottom)
 * @returns {Promise<Jimp>} - Combined image
 */
async function combineImagesVertically(iconImage, textImage) {
  const iconWidth = iconImage.getWidth();
  const iconHeight = iconImage.getHeight();
  const textWidth = textImage.getWidth();
  const textHeight = textImage.getHeight();
  
  // Calculate final dimensions
  const finalWidth = Math.max(iconWidth, textWidth);
  const spacing = 10; // 10px spacing between icon and text
  const finalHeight = iconHeight + spacing + textHeight;
  
  // Create final image with transparent background
  const finalImage = new Jimp(finalWidth, finalHeight, 0x00000000);
  
  // Center and place icon at the top
  const iconX = Math.floor((finalWidth - iconWidth) / 2);
  finalImage.composite(iconImage, iconX, 0);
  
  // Center and place text below icon
  const textX = Math.floor((finalWidth - textWidth) / 2);
  const textY = iconHeight + spacing;
  finalImage.composite(textImage, textX, textY);
  
  return finalImage;
}

module.exports = {
  processLogo
};
