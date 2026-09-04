from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from scipy import ndimage

# Load image
img = Image.open(r'C:\Users\DBORINGO\Desktop\Marc Project\Messenger Of Peace\client\public\images\logo.PNG').convert('RGBA')
arr = np.array(img)
h, w = arr.shape[:2]
print(f"Image: {w}x{h}")

# Step 1: Identify background pixels (light colored)
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
brightness = (r.astype(int) + g.astype(int) + b.astype(int)) / 3

# Background: pixels where all channels > 225 (light gray to white)
# Also include the rightmost column strip which is gray
bg_candidates = (brightness > 225) | (np.arange(w)[None, :] >= w - 2)

# Step 2: Flood fill from edges using scipy
# Create edge seeds
edge_mask = np.zeros((h, w), dtype=bool)
edge_mask[0, :] = True  # top row
edge_mask[-1, :] = True  # bottom row
edge_mask[:, 0] = True  # left column
edge_mask[:, -1] = True  # right column

# Only seed from bright pixels at edges
seed_mask = edge_mask & bg_candidates

# Label connected components from seeds
labeled, num_features = ndimage.label(seed_mask)
print(f"Found {num_features} edge-connected regions")

# Flood fill: propagate bg_candidates through connected regions
# Use iterative dilation of the seed through bg_candidates
bg_mask = seed_mask.copy()
for i in range(max(h, w)):
    new_bg = ndimage.binary_dilation(bg_mask) & bg_candidates & ~bg_mask
    if not new_bg.any():
        break
    bg_mask |= new_bg
    if i % 20 == 0:
        print(f"  iteration {i}: {bg_mask.sum()} bg pixels")

print(f"Total background pixels: {bg_mask.sum()} / {h*w} ({100*bg_mask.sum()/(h*w):.1f}%)")

# Step 3: Create output with transparent background
output = arr.copy()
output[bg_mask] = [255, 255, 255, 0]

# Step 4: Find content bounding box and create circular crop
content_mask = output[:, :, 3] > 0
if content_mask.any():
    rows = np.any(content_mask, axis=1)
    cols = np.any(content_mask, axis=0)
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    print(f"Content bbox: y=[{rmin},{rmax}], x=[{cmin},{cmax}]")
    
    # Calculate circle params
    cy = (rmin + rmax) / 2
    cx = (cmin + cmax) / 2
    half_h = (rmax - rmin) / 2
    half_w = (cmax - cmin) / 2
    radius = max(half_h, half_w) + 2
    print(f"Circle center: ({cx:.0f}, {cy:.0f}), radius: {radius:.0f}")
    
    # Circular mask
    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((X - cx)**2 + (Y - cy)**2)
    circle_mask = dist <= radius
    output[~circle_mask, 3] = 0

# Step 5: Anti-alias the alpha edges
alpha = Image.fromarray(output[:, :, 3])
# Blur and threshold for smoother edges
alpha_smooth = alpha.filter(ImageFilter.GaussianBlur(radius=0.8))
alpha_arr = np.array(alpha_smooth)
alpha_arr = np.where(alpha_arr > 20, alpha_arr, 0)
output[:, :, 3] = alpha_arr

# Save
result = Image.fromarray(output)
out_path = r'C:\Users\DBORINGO\Desktop\Marc Project\Messenger Of Peace\client\public\images\logo-transparent.png'
result.save(out_path, 'PNG')
print(f"\nSaved: {out_path}")

# Also save a smaller version for sidebar/navbar use
result_small = result.resize((120, 120), Image.LANCZOS)
result_small.save(r'C:\Users\DBORINGO\Desktop\Marc Project\Messenger Of Peace\client\public\images\logo-small.png', 'PNG')
print("Saved: logo-small.png (120x120)")
