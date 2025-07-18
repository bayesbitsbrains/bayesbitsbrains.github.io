#!/usr/bin/env python3
"""
Script to create a thumbnail with the Morpheus image, adding text labels
"Truth" above the red pill and "Model" above the blue pill.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_thumbnail():
    # Path to the original image
    input_path = "/home/vasek/bayesbitsbrains.github.io/public/fig/pills.png"
    output_path = "/home/vasek/bayesbitsbrains.github.io/public/fig/pills_thumbnail.png"
    
    # Load the original image
    img = Image.open(input_path)
    
    # Create a drawing context
    draw = ImageDraw.Draw(img)
    
    # Get image dimensions
    width, height = img.size
    
    # Try to use a system font, fall back to default if not available
    try:
        # Try to find a bold font
        font_size = int(width * 0.10)  # Scale font size to image width (increased from 0.08)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        try:
            # Fallback to regular font
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
        except:
            # Last resort: use default font
            font = ImageFont.load_default()
    
    # Text settings
    truth_text_color = "red"
    model_text_color = "blue"
    outline_color = "black"
    outline_width = 2
    
    # Approximate positions based on the image (red pill is on left, blue pill on right)
    # Red pill (left side) - "Truth" - not too far from center
    truth_text = "Truth"
    truth_x = width * 0.20  # Closer to center
    truth_y = height * 0.68  # Higher up (moved from 0.75 to 0.68)
    
    # Blue pill (right side) - "Model" - not too far from center
    model_text = "Model"
    model_x = width * 0.80  # Closer to center
    model_y = height * 0.68  # Higher up (moved from 0.75 to 0.68)
    
    # Get text bounding boxes for centering
    truth_bbox = draw.textbbox((0, 0), truth_text, font=font)
    truth_width = truth_bbox[2] - truth_bbox[0]
    truth_height = truth_bbox[3] - truth_bbox[1]
    
    model_bbox = draw.textbbox((0, 0), model_text, font=font)
    model_width = model_bbox[2] - model_bbox[0]
    model_height = model_bbox[3] - model_bbox[1]
    
    # Center the text
    truth_x -= truth_width // 2
    truth_y -= truth_height // 2
    model_x -= model_width // 2
    model_y -= model_height // 2
    
    # Draw text with outline for better visibility
    # Draw "Truth" above red pill in red
    for dx in range(-outline_width, outline_width + 1):
        for dy in range(-outline_width, outline_width + 1):
            if dx != 0 or dy != 0:
                draw.text((truth_x + dx, truth_y + dy), truth_text, font=font, fill=outline_color)
    draw.text((truth_x, truth_y), truth_text, font=font, fill=truth_text_color)
    
    # Draw "Model" above blue pill in blue
    for dx in range(-outline_width, outline_width + 1):
        for dy in range(-outline_width, outline_width + 1):
            if dx != 0 or dy != 0:
                draw.text((model_x + dx, model_y + dy), model_text, font=font, fill=outline_color)
    draw.text((model_x, model_y), model_text, font=font, fill=model_text_color)
    
    # Save the thumbnail
    img.save(output_path)
    print(f"Thumbnail created: {output_path}")
    
    # Also create a smaller version for social media
    thumbnail_small = img.copy()
    thumbnail_small.thumbnail((1200, 630), Image.Resampling.LANCZOS)  # Twitter/Facebook optimal size
    small_output_path = "/home/vasek/bayesbitsbrains.github.io/public/fig/pills_thumbnail_small.png"
    thumbnail_small.save(small_output_path)
    print(f"Small thumbnail created: {small_output_path}")

if __name__ == "__main__":
    create_thumbnail()