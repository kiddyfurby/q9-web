import json
import os

def build_robust_manifest():
    with open('/Users/garfield/Developer/q9-web/src/data/db.json', 'r') as f:
        db = json.load(f)
    with open('/Users/garfield/Developer/q9-web-2026/Q9.IM_', 'rb') as f:
        data = f.read()

    manifest = { "db": [], "glyph": [] }
    
    symbol_block_start = data.find('１＝≠±'.encode('big5'))
    surname_start = data.find('麥趙楊黃'.encode('big5'))
    
    print(f"Symbols: {symbol_block_start}, Surnames: {surname_start}")

    keys = list(db.keys())
    
    # 01 - 09 are static block
    current_pos = symbol_block_start
    for k in ['01', '02', '03', '04', '05', '06', '07', '08', '09']:
        l = len(db[k])
        manifest["db"].append({"k": k, "o": current_pos, "l": l})
        current_pos += l * 2
        
    # 10 onwards
    # First pass: find all that we can find globally
    found_offsets = {} # key -> offset
    
    for k in keys:
        if k in ['01', '02', '03', '04', '05', '06', '07', '08', '09']: continue
        val = db[k]
        if not val: continue
        
        # Try different lengths of prefix to find unique match
        for trial_len in [10, 6, 4]:
            try:
                target = val[:trial_len].encode('big5')
                idx = data.find(target)
                if idx != -1:
                    found_offsets[k] = idx
                    break
            except:
                continue

    print(f"Found {len(found_offsets)} offsets globally.")
    
    # Second pass: fill in gaps by interpolation or following previous
    current_pos = surname_start
    for k in keys:
        if k in ['01', '02', '03', '04', '05', '06', '07', '08', '09']: continue
        
        l = len(db[k])
        if k in found_offsets:
            current_pos = found_offsets[k]
        
        manifest["db"].append({"k": k, "o": current_pos, "l": l})
        
        # Advance current_pos for next guess
        current_pos += l * 2

    # Glyphs
    # Find Case 0 again
    g0_idx = data.find('āăăą'.encode('utf-16-le')) # No wait, they are radicals
    # Radical a3a5 starts at 320998
    manifest["glyph"].append({"o": 320998, "l": 9})

    with open('/Users/garfield/Developer/q9-web-2026/src/content/data/recipes.json', 'w') as f:
        json.dump(manifest, f)
    
    print(f"Generated {len(manifest['db'])} entries.")

build_robust_manifest()
