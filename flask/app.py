from flask import Flask, render_template, jsonify, request
from static.scripts.init_db import db_connectionHandler
from werkzeug.middleware.dispatcher import DispatcherMiddleware
from werkzeug.exceptions import NotFound

app = Flask(__name__)

@app.route('/')
def wfd_home():
    return render_template('WhatsForDinner.html', title="WhatsForDinner")

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "static", "scripts", "db", "db_file.db")
@app.route('/api/recipes/search', methods=['GET'])
def search_recipes():
    include = request.args.getlist('include')
    exclude = request.args.getlist('exclude')
    with db_connectionHandler(DB_FILE) as db:
        results = db.run_script("search_recipes", include, exclude)
    return jsonify(results or [])

@app.route('/api/recipes/<int:recipe_id>/ingredients', methods=['GET'])
def get_recipe_ingredients(recipe_id):
    with db_connectionHandler(DB_FILE) as db:
        results = db.modules['search_recipes'].find_ingredients(db.conn, recipe_id)
    return jsonify(results or [])

@app.route('/team')
def team():
    return render_template('team.html', title="team")

@app.route('/about')
def about():
    return render_template('about.html', title="about")

@app.route('/docs')
def docs():
    return render_template('docs.html', title="docs")

# wrap flask in DispatcherMiddleware to mount it under /wfd
app.wsgi_app = DispatcherMiddleware(NotFound(), {
    '/wfd': app.wsgi_app
})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)