"""
MODULE NAME: search_recipes
DESCRIPTION: Queries the SQLite DB to find recipes containing/excluding selected ingredients.
USAGE: db.run_script("search_recipes", ["ingredient1", "ingredient2"], ["ingredient3", "ingredient4"])
"""
# this function was written with the assistance of Gemini 3.5 Flash (medium)
DESCRIPTION = __doc__

def run(conn, include_ingredients, exclude_ingredients):
    cur = conn.cursor()
    
    # early fail, handle case where no ingredients are selected to search
    if not include_ingredients:
        return []
        
    params = []
    
    # Placeholders for included ingredients
    include_seq = ','.join(['?'] * len(include_ingredients))
    params.extend(include_ingredients)
    
    # Build optional exclude clause if any are passed
    exclude_clause = ""
    if exclude_ingredients:
        exclude_seq = ','.join(['?'] * len(exclude_ingredients))
        exclude_clause = f"""
            AND r.recipe_id NOT IN (
                SELECT DISTINCT ri_ex.recipe_id
                FROM recipe_ingredients ri_ex
                JOIN table_ingredients i_ex ON ri_ex.ingredient_id = i_ex.ingredient_id
                WHERE i_ex.name IN ({exclude_seq})
            )
        """
        params.extend(exclude_ingredients)
        
    query = f"""
        SELECT DISTINCT r.recipe_id, r.name, r.description, r.instruction, r.prep_time, r.cook_time, r.servings, r.image_url
        FROM table_recipes r
        JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
        JOIN table_ingredients i ON ri.ingredient_id = i.ingredient_id
        WHERE i.name IN ({include_seq})
        {exclude_clause}
    """
    
    cur.execute(query, params)
    rows = cur.fetchall()
    
    # Format database rows as a list of dictionaries for clean JSON translation
    return [{"id": r[0], "name": r[1], "description": r[2], "instruction": r[3], "time": str(int(r[4] or 0) + int(r[5] or 0)) + " mins", "servings": r[6], "image_url": r[7]} for r in rows]


def find_ingredients(conn, recipe_id):
    cur = conn.cursor()
    query = """
        SELECT i.name, ri.quantity, ri.unit
        FROM recipe_ingredients ri
        JOIN table_ingredients i ON ri.ingredient_id = i.ingredient_id
        WHERE ri.recipe_id = ?
    """
    cur.execute(query, (recipe_id,))
    rows = cur.fetchall()
    return [{"ing_name": r[0], "ing_qnt": r[1], "ing_unit": r[2]} for r in rows]