"""
Migration: add week_start column to s_day table.
week_start = NULL  → template récurrent (comportement actuel)
week_start = DATE  → semaine spécifique (lundi de la semaine)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.core.database import engine
from sqlalchemy import text

def run():
    sql = "ALTER TABLE public.s_day ADD COLUMN IF NOT EXISTS week_start DATE DEFAULT NULL"
    with engine.connect() as conn:
        try:
            print("Adding week_start column to s_day...")
            conn.execute(text(sql))
            conn.commit()
            print("  ✅ Done")
        except Exception as e:
            print(f"  ❌ Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    run()
