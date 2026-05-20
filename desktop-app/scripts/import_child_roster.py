import argparse
import datetime as dt
import json
import shutil
import sqlite3
import urllib.request
from pathlib import Path


CHILD_COLUMNS = [
    "id",
    "name",
    "gender",
    "phone",
    "resident_no",
    "birth_date",
    "age",
    "school",
    "grade",
    "address",
    "use_type",
    "income_level",
    "guardian_name",
    "guardian_relation",
    "family_type",
    "guardian_contact",
    "vulnerable_type",
    "status",
    "joined_at",
    "left_at",
    "manager",
    "kids_id",
    "memo",
    "sync_status",
]


def compact_name(value):
    return "".join(str(value or "").split()).lower()


def stable_child_id(name):
    safe = "".join(ch for ch in str(name or "").replace(" ", "") if ch.isalnum() or ch in "_-")
    return f"child-{safe or 'unknown'}"


def fill_score(child):
    return sum(1 for value in child.values() if str(value or "").strip())


def merge_child(left, right):
    primary, secondary = (right, left) if fill_score(right) > fill_score(left) else (left, right)
    merged = dict(primary)
    for key, value in secondary.items():
        if not str(merged.get(key) or "").strip() and str(value or "").strip():
            merged[key] = value
    joined_left = str(left.get("joinedAt") or "")
    joined_right = str(right.get("joinedAt") or "")
    if joined_left and joined_right:
        merged["joinedAt"] = min(joined_left, joined_right)
    elif joined_left or joined_right:
        merged["joinedAt"] = joined_left or joined_right
    left_at_left = str(left.get("leftAt") or "")
    left_at_right = str(right.get("leftAt") or "")
    merged["leftAt"] = "" if not left_at_left or not left_at_right else max(left_at_left, left_at_right)
    merged["status"] = "재원" if not merged["leftAt"] else str(merged.get("status") or "퇴소")
    merged["id"] = stable_child_id(merged.get("name"))
    return merged


def dedupe_children(children):
    by_name = {}
    old_to_new = {}
    for child in children:
        name = str(child.get("name") or "").strip()
        if not name:
            continue
        item = dict(child)
        item["id"] = stable_child_id(name)
        key = compact_name(name)
        old_id = str(child.get("id") or item["id"])
        by_name[key] = merge_child(by_name[key], item) if key in by_name else item
        old_to_new[old_id] = by_name[key]["id"]
    result = sorted(by_name.values(), key=lambda item: str(item.get("name") or ""))
    for child in result:
        old_to_new[str(child.get("id") or "")] = str(child.get("id") or "")
    return result, old_to_new


def read_payload(url):
    with urllib.request.urlopen(url, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def child_values(child):
    return [
        child.get("id") or stable_child_id(child.get("name")),
        child.get("name") or "",
        child.get("gender") or "",
        child.get("phone") or "",
        child.get("residentNo") or "",
        child.get("birthDate") or "",
        child.get("age") or "",
        child.get("school") or "",
        child.get("grade") or "",
        child.get("address") or "",
        child.get("useType") or "",
        child.get("incomeLevel") or "",
        child.get("guardianName") or "",
        child.get("guardianRelation") or "",
        child.get("familyType") or "",
        child.get("guardianContact") or "",
        child.get("vulnerableType") or "",
        child.get("status") or "재원",
        child.get("joinedAt") or "",
        child.get("leftAt") or "",
        child.get("manager") or "",
        child.get("kidsId") or "",
        child.get("memo") or "",
        "synced",
    ]


def import_payload(db_path, payload):
    children, old_to_new = dedupe_children(payload.get("children") or [])
    attendance_seen = set()
    attendance_rows = []
    for item in payload.get("childAttendance") or []:
        child_id = old_to_new.get(str(item.get("childId") or ""), str(item.get("childId") or ""))
        date = str(item.get("date") or "")
        if not child_id or not date:
            continue
        key = (child_id, date)
        if key in attendance_seen:
            continue
        attendance_seen.add(key)
        attendance_rows.append(
            (
                f"child-attendance-{child_id}-{date}",
                child_id,
                date,
                str(item.get("yearMonth") or date[:7]),
                str(item.get("status") or "present"),
                str(item.get("memo") or ""),
                str(item.get("syncedAt") or "imported"),
            )
        )

    backup_path = db_path.with_suffix(db_path.suffix + "." + dt.datetime.now().strftime("%Y%m%d%H%M%S") + ".bak")
    shutil.copy2(db_path, backup_path)

    placeholders = ", ".join("?" for _ in CHILD_COLUMNS)
    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA foreign_keys=OFF")
        conn.execute("BEGIN")
        conn.execute("DELETE FROM child_attendance")
        conn.execute("DELETE FROM children")
        conn.executemany(
            f"INSERT OR REPLACE INTO children ({', '.join(CHILD_COLUMNS)}) VALUES ({placeholders})",
            [child_values(child) for child in children],
        )
        conn.executemany(
            "INSERT OR REPLACE INTO child_attendance (id, child_id, date, year_month, status, memo, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            attendance_rows,
        )
        conn.commit()
    return backup_path, len(children), len(attendance_rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--url", required=True)
    args = parser.parse_args()
    db_path = Path(args.db)
    payload = read_payload(args.url)
    backup_path, child_count, attendance_count = import_payload(db_path, payload)
    print(f"backup={backup_path}")
    print(f"children={child_count}")
    print(f"childAttendance={attendance_count}")


if __name__ == "__main__":
    main()
