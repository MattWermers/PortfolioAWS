"""
Title: populate_recipes
Description: Loads recipe rows from a staging CSV (title, ingredients,
             distinct_ingredients, num_ingredients, link, source) into
             table_recipe_staging, then normalizes those rows into
             table_recipes, table_ingredients, and recipe_ingredients.
Notes:
  1. table_recipes.instruction is NOT NULL. Directions are pulled from the
     staging "directions" column and joined into one text block; falls back
     to a placeholder for any staging rows that predate that column.
  2. recipe_ingredients.quantity is REAL, so fractional amounts (e.g.
     "1/2 c. sugar") are stored exactly (0.5) rather than rounded. Requires
     init_db.py's recipe_ingredients.quantity column to be REAL, not INTEGER.
  3. Ingredient/quantity/unit matching is a heuristic: canonical names come
     from the cleaned distinct_ingredients column, then matched back into
     the raw ingredient lines by substring to recover quantity/unit. Not
     every ingredient will find a match (e.g. unit words that get stripped
     before matching, like "1 clove garlic" -> "clove garlic" not matching
     "garlic, minced").
"""

# Ingredient parsing and staging->production migration logic developed
# with assistance from Claude (Anthropic), August 2026.

import ast
import csv
import re
import sqlite3
from fractions import Fraction
from pathlib import Path

DESCRIPTION = __doc__

# --- Ingredient line parsing -------------------------------------------------

FRACTION_RE = re.compile(r'^(\d+\s+\d+/\d+|\d+/\d+|\d*\.\d+|\d+)')
UNIT_WORDS = {
    'c', 'c.', 'cup', 'cups', 'tsp', 'tsp.', 'teaspoon', 'teaspoons',
    'tbsp', 'tbsp.', 'tablespoon', 'tablespoons', 'oz', 'oz.', 'ounce', 'ounces',
    'lb', 'lb.', 'lbs', 'pound', 'pounds', 'pkg', 'pkg.', 'package', 'packages',
    'can', 'cans', 'jar', 'jars', 'clove', 'cloves', 'pinch', 'dash',
    'qt', 'qt.', 'quart', 'quarts', 'pt', 'pt.', 'pint', 'pints',
    'gal', 'gal.', 'gallon', 'gallons', 'ml', 'g', 'g.', 'kg', 'stick', 'sticks',
}


def parse_qty_unit_name(raw_line):
    """Best-effort split of a raw ingredient line like '1 c. bacon grease'
    into (quantity, unit, name). Falls back to (None, None, raw_line) when
    the leading text isn't a recognizable amount."""
    text = str(raw_line).strip()
    match = FRACTION_RE.match(text)
    if not match:
        return None, None, text

    qty_str = match.group(1)
    rest = text[match.end():].strip()

    try:
        if ' ' in qty_str:  # mixed number, e.g. "1 1/2"
            whole, frac = qty_str.split(' ', 1)
            qty_val = float(whole) + float(Fraction(frac))
        elif '/' in qty_str:
            qty_val = float(Fraction(qty_str))
        else:
            qty_val = float(qty_str)
    except (ValueError, ZeroDivisionError):
        return None, None, text

    parts = rest.split(' ', 1)
    first_word = parts[0].lower().strip('.') if parts else ''
    if first_word in UNIT_WORDS:
        unit = parts[0]
        name = parts[1].strip() if len(parts) > 1 else ''
    else:
        unit = None
        name = rest

    return qty_val, unit, (name or rest)


# --- Step 1: load the staging CSV --------------------------------------------

def load_staging_csv(conn, csv_path):
    """Load a diversity-sample CSV (title, ingredients, distinct_ingredients,
    num_ingredients, link, source) into table_recipe_staging."""
    cur = conn.cursor()
    rows = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append((
                row.get('title'),
                row.get('ingredients'),
                row.get('distinct_ingredients'),
                int(row['num_ingredients']) if row.get('num_ingredients') else None,
                row.get('link'),
                row.get('source'),
                row.get('directions'),
            ))

    cur.executemany(
        '''INSERT INTO table_recipe_staging
           (title, ingredients, distinct_ingredients, num_ingredients, link, source, directions)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        rows,
    )
    conn.commit()
    print(f"Loaded {len(rows)} rows into table_recipe_staging.")


# --- Step 2: normalize staging into production tables ------------------------

def migrate_staging_to_production(conn):
    """Read every row out of table_recipe_staging and populate
    table_recipes, table_ingredients, and recipe_ingredients."""
    cur = conn.cursor()
    cur.execute(
        'SELECT rowid, title, ingredients, distinct_ingredients, link, source, directions '
        'FROM table_recipe_staging'
    )
    staged = cur.fetchall()

    inserted_recipes = 0
    inserted_ingredients = 0
    skipped = []

    for rowid, title, ingredients_raw, distinct_raw, link, source, directions_raw in staged:
        try:
            ingredient_lines = ast.literal_eval(ingredients_raw)
        except (ValueError, SyntaxError):
            skipped.append((rowid, title, 'unparseable ingredients'))
            continue

        # distinct_ingredients is the already-cleaned canonical name list from the
        # earlier de-dup/junk-token pass -- use it for names so table_ingredients
        # doesn't fill up with near-duplicates like "onions" vs "medium onions, chopped".
        canonical_names = [n.strip().lower() for n in distinct_raw.split(',') if n.strip()]

        # directions is stored the same way ingredients is: a Python-list-looking
        # string of steps. Join them into one instruction block; fall back to a
        # placeholder for any older staging rows that predate the directions column.
        try:
            direction_steps = ast.literal_eval(directions_raw) if directions_raw else []
            instruction = '\n'.join(str(step).strip() for step in direction_steps if str(step).strip())
        except (ValueError, SyntaxError):
            instruction = ''
        if not instruction:
            instruction = "TODO: instructions not captured for this recipe."

        cur.execute(
            '''INSERT INTO table_recipes (name, description, instruction, image_url)
               VALUES (?, ?, ?, ?)''',
            (title, source, instruction, None),
        )
        recipe_id = cur.lastrowid
        inserted_recipes += 1

        # Parse each raw line for qty/unit, then match it back to a canonical name
        # by substring containment (raw lines still carry the canonical name plus
        # prep descriptors, e.g. "1 clove garlic, minced" contains "garlic").
        parsed_lines = [parse_qty_unit_name(line) for line in ingredient_lines]

        for name in canonical_names:
            qty, unit = None, None
            for line_qty, line_unit, line_name in parsed_lines:
                if name and name in line_name.lower():
                    qty, unit = line_qty, line_unit
                    break

            cur.execute('SELECT ingredient_id FROM table_ingredients WHERE name = ?', (name,))
            existing = cur.fetchone()
            if existing:
                ingredient_id = existing[0]
            else:
                cur.execute(
                    'INSERT INTO table_ingredients (name, category, is_staple) VALUES (?, ?, 0)',
                    (name, None),
                )
                ingredient_id = cur.lastrowid
                inserted_ingredients += 1

            cur.execute(
                '''INSERT OR IGNORE INTO recipe_ingredients
                   (recipe_id, ingredient_id, quantity, unit, is_optional)
                   VALUES (?, ?, ?, ?, 0)''',
                (recipe_id, ingredient_id, qty, unit),
            )

    conn.commit()
    print(f"Inserted {inserted_recipes} recipes and {inserted_ingredients} new ingredients.")
    if skipped:
        print(f"Skipped {len(skipped)} staging rows (unparseable ingredients):")
        for rowid, title, reason in skipped[:10]:
            print(f"  - row {rowid} '{title}': {reason}")


def run(conn=None, csv_path=None):
    """Entry point matching the db_scripts/ convention (DESCRIPTION + run(sqlite.connection , csv_path)).
    NOTE: Must receive db connection and csv_source filepath from calling function"""
    own_connection = conn is None
    if own_connection:
        conn = sqlite3.connect(Path("../db/db_file.db"))

    if csv_path and Path(csv_path).is_file():
        load_staging_csv(conn, csv_path)

    migrate_staging_to_production(conn)

    if own_connection:
        conn.close()


if __name__ == "__main__":
    db_path = Path("../db/db_file.db")
    csv_path = Path("../db_source/source.csv")  # adjust to your actual filename

    connection = sqlite3.connect(db_path)
    if csv_path.is_file():
        load_staging_csv(connection, csv_path)
    else:
        print(f"No CSV found at {csv_path} -- assuming table_recipe_staging is already populated.")

    migrate_staging_to_production(connection)
    connection.close()
