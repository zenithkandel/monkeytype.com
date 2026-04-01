import json
import statistics

# Read the file
with open(r'c:\xampp\htdocs\codes\monkeytype.com\past-result.txt', 'r') as f:
    content = f.read()

# Parse each line as JSON
lines = [l.strip() for l in content.strip().split('\n') if l.strip()]
print(f"Total lines: {len(lines)}")

all_key_spacings = []
all_key_durations = []
all_wpm = []
all_consistency = []

results = []
for i, line in enumerate(lines):
    try:
        data = json.loads(line)
        results.append(data)
        r = data.get('result', data)
        print(f"\n=== Result {i+1} ===")
        print(f"WPM: {r.get('wpm')}, Raw: {r.get('rawWpm')}, Acc: {r.get('acc')}")
        print(f"Consistency: {r.get('consistency')}, Duration: {r.get('testDuration')}s")
        print(f"CharTotal: {r.get('charTotal')}")
        ks = r.get('keySpacing', [])
        kd = r.get('keyDuration', [])
        print(f"KeySpacing len: {len(ks)}, KeyDuration len: {len(kd)}")
        
        all_key_spacings.extend(ks)
        all_key_durations.extend(kd)
        all_wpm.append(r.get('wpm', 0))
        all_consistency.append(r.get('consistency', 0))
        
        if ks and len(ks) > 1:
            print(f"KeySpacing - Mean: {statistics.mean(ks):.2f}, StdDev: {statistics.stdev(ks):.2f}, CV: {statistics.stdev(ks)/statistics.mean(ks):.3f}")
            print(f"KeySpacing - Min: {min(ks):.2f}, Max: {max(ks):.2f}")
        if kd and len(kd) > 1:
            print(f"KeyDuration - Mean: {statistics.mean(kd):.2f}, StdDev: {statistics.stdev(kd):.2f}, CV: {statistics.stdev(kd)/statistics.mean(kd):.3f}")
            print(f"KeyDuration - Min: {min(kd):.2f}, Max: {max(kd):.2f}")
    except Exception as e:
        print(f"Error on line {i+1}: {e}")

# Overall statistics
print("\n" + "="*50)
print("OVERALL HUMAN TYPING STATISTICS")
print("="*50)
if all_key_spacings:
    print(f"All KeySpacing - Mean: {statistics.mean(all_key_spacings):.2f}ms")
    print(f"All KeySpacing - StdDev: {statistics.stdev(all_key_spacings):.2f}ms")
    print(f"All KeySpacing - CV: {statistics.stdev(all_key_spacings)/statistics.mean(all_key_spacings):.3f}")
    print(f"All KeySpacing - Min: {min(all_key_spacings):.2f}ms, Max: {max(all_key_spacings):.2f}ms")
    
    # Percentiles
    sorted_ks = sorted(all_key_spacings)
    p10 = sorted_ks[int(len(sorted_ks)*0.10)]
    p25 = sorted_ks[int(len(sorted_ks)*0.25)]
    p50 = sorted_ks[int(len(sorted_ks)*0.50)]
    p75 = sorted_ks[int(len(sorted_ks)*0.75)]
    p90 = sorted_ks[int(len(sorted_ks)*0.90)]
    print(f"KeySpacing Percentiles - P10: {p10:.1f}, P25: {p25:.1f}, P50: {p50:.1f}, P75: {p75:.1f}, P90: {p90:.1f}")

if all_key_durations:
    print(f"\nAll KeyDuration - Mean: {statistics.mean(all_key_durations):.2f}ms")
    print(f"All KeyDuration - StdDev: {statistics.stdev(all_key_durations):.2f}ms")
    print(f"All KeyDuration - CV: {statistics.stdev(all_key_durations)/statistics.mean(all_key_durations):.3f}")
    print(f"All KeyDuration - Min: {min(all_key_durations):.2f}ms, Max: {max(all_key_durations):.2f}ms")
    
    sorted_kd = sorted(all_key_durations)
    p10 = sorted_kd[int(len(sorted_kd)*0.10)]
    p25 = sorted_kd[int(len(sorted_kd)*0.25)]
    p50 = sorted_kd[int(len(sorted_kd)*0.50)]
    p75 = sorted_kd[int(len(sorted_kd)*0.75)]
    p90 = sorted_kd[int(len(sorted_kd)*0.90)]
    print(f"KeyDuration Percentiles - P10: {p10:.1f}, P25: {p25:.1f}, P50: {p50:.1f}, P75: {p75:.1f}, P90: {p90:.1f}")

print(f"\nWPM Range: {min(all_wpm):.1f} - {max(all_wpm):.1f}, Mean: {statistics.mean(all_wpm):.1f}")
print(f"Consistency Range: {min(all_consistency):.1f} - {max(all_consistency):.1f}")
