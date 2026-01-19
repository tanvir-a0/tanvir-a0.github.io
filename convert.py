import os
from PIL import Image
from pathlib import Path

def convert_png_to_jpg(root_folder, delete_original=False, quality=95):
    root_path = Path(root_folder)
    
    if not root_path.exists():
        print(f"Error: Folder '{root_folder}' does not exist")
        return
    
    converted_count = 0
    error_count = 0
    
    for png_file in root_path.rglob('*.png'):
        try:
            jpg_file = png_file.with_suffix('.jpg')
            
            with Image.open(png_file) as img:
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    rgb_img = background
                else:
                    rgb_img = img.convert('RGB')
                
                rgb_img.save(jpg_file, 'JPEG', quality=quality, optimize=True)
            
            print(f"✓ Converted: {png_file.relative_to(root_path)}")
            converted_count += 1
            
            if delete_original:
                png_file.unlink()
                print(f"  Deleted original PNG")
                
        except Exception as e:
            print(f"✗ Error converting {png_file.relative_to(root_path)}: {e}")
            error_count += 1
    
    print(f"\n{'='*50}")
    print(f"Conversion complete!")
    print(f"Successfully converted: {converted_count} files")
    if error_count > 0:
        print(f"Errors: {error_count} files")
    print(f"{'='*50}")

if __name__ == "__main__":
    folder_path = "assets"
    
    convert_png_to_jpg(
        root_folder=folder_path,
        delete_original=False,
        quality=95
    )