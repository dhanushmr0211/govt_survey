import os
from PIL import Image, ImageDraw, ImageOps

def crop_to_circle(source_path, target_path):
    print(f"Opening source image: {source_path}")
    img = Image.open(source_path).convert("RGBA")
    w, h = img.size
    print(f"Original size: {w}x{h}")
    
    # 1. Make the image square if it's not already
    size = max(w, h)
    squared_img = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    # Paste centered
    x_offset = (size - w) // 2
    y_offset = (size - h) // 2
    squared_img.paste(img, (x_offset, y_offset), img)
    
    # 2. Add padding to make sure no text or elements near the edges are cut off by the circle
    padding = int(size * 0.12)  # 12% padding
    new_size = size + 2 * padding
    padded_img = Image.new("RGBA", (new_size, new_size), (255, 255, 255, 255))
    padded_img.paste(squared_img, (padding, padding))
    
    # 3. Create a circular mask
    mask = Image.new("L", (new_size, new_size), 0)
    draw = ImageDraw.Draw(mask)
    # Draw a filled white circle
    draw.ellipse((0, 0, new_size, new_size), fill=255)
    
    # 4. Apply the mask to the padded image
    output_img = Image.new("RGBA", (new_size, new_size), (0, 0, 0, 0))
    output_img.paste(padded_img, (0, 0), mask)
    
    # 5. Crop transparent borders (autocrop) to make it a tight circular fit
    # Get bounding box of non-zero alpha pixels
    bbox = output_img.getbbox()
    if bbox:
        output_img = output_img.crop(bbox)
        
    # Resize to a standard high-quality size, e.g. 512x512
    output_img = output_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    print(f"Saving circular cropped image to: {target_path}")
    output_img.save(target_path, "PNG")
    print("Crop complete!")

if __name__ == "__main__":
    src = r"C:\Users\hpadmin\.gemini\antigravity\brain\857e0aec-4403-4071-897a-fa9505ac487e\media__1779043929391.jpg"
    dest = r"c:\Users\hpadmin\Desktop\govt_survey\frontend\public\logo.png"
    
    # Check if directories exist
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    crop_to_circle(src, dest)
