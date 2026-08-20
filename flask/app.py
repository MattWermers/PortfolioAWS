import os
from flask import Flask, send_from_directory
from werkzeug.middleware.dispatcher import DispatcherMiddleware
from werkzeug.exceptions import NotFound

# Import the WhatsForDinner Flask app instance
from wfd.app import app as wfd_app
from dwplus.app import app as dwplus_app

# Path to the compiled Jekyll static site
JEKYLL_SITE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../static/_site'))

if os.path.exists(JEKYLL_SITE_DIR):
    # Set up a root Flask app to serve the Jekyll static files for local testing
    main_app = Flask(__name__)

    @main_app.route('/', defaults={'path': ''})
    @main_app.route('/<path:path>')
    def serve_jekyll_site(path):
        full_path = os.path.join(JEKYLL_SITE_DIR, path)
        # If the path points to a directory, serve its index.html
        if os.path.isdir(full_path):
            return send_from_directory(JEKYLL_SITE_DIR, os.path.join(path, 'index.html'))
        return send_from_directory(JEKYLL_SITE_DIR, path)
else:
    # Fallback to returning 404 for root path if Jekyll site isn't built yet
    main_app = NotFound()

# Mount the sub-apps
app = DispatcherMiddleware(main_app, {
    '/wfd': wfd_app,
    '/dwplus': dwplus_app
})

if __name__ == '__main__':
    from werkzeug.serving import run_simple
    print("Starting development server on http://localhost:5000")
    run_simple('0.0.0.0', 5000, app, use_reloader=True, use_debugger=True)


