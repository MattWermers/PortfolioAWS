import os
import click
import requests
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for
)
from flask_login import (
    LoginManager, UserMixin,
    login_user, logout_user, login_required, current_user
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)
app.config['SECRET_KEY']                  = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI']     = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

AZURE_FUNCTIONS_URL = os.environ.get('AZURE_FUNCTIONS_URL', 'http://localhost:7071')

# ─── Extensions ───────────────────────────────────────────────────────────────

db           = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view    = 'login'
login_manager.login_message = 'Please log in to access this page.'

# ─── Models ───────────────────────────────────────────────────────────────────

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin      = db.Column(db.Boolean, default=False, nullable=False)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    """Return 401 JSON for API requests; redirect to login for page requests."""
    if request.is_json or request.path.startswith('/api/'):
        return jsonify({'error': 'login_required'}), 401
    return redirect(url_for('login', next=request.path))

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _is_safe_redirect(target):
    """Guard against open-redirect attacks on the ?next= parameter."""
    ref  = urlparse(request.host_url)
    test = urlparse(urljoin(request.host_url, target))
    return test.scheme in ('http', 'https') and ref.netloc == test.netloc

# ─── Page routes ──────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('landing.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user     = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            next_page = request.args.get('next')
            if next_page and _is_safe_redirect(next_page):
                return redirect(next_page)
            return redirect(url_for('index'))

        error = 'Invalid username or password.'

    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


@app.route('/dashboard/<job_id>')
@login_required
def job_detail(job_id):
    return render_template('job_detail.html', job_id=job_id)

# ─── API proxy routes ─────────────────────────────────────────────────────────
# All calls go through here — the browser never talks to Azure Functions directly.
# user_id is injected server-side so the frontend cannot spoof it.

@app.route('/api/proxy/jobs', methods=['POST'])
@login_required
def proxy_create_job():
    payload = request.get_json(force=True) or {}
    payload['userId'] = str(current_user.id)
    try:
        resp = requests.post(
            f'{AZURE_FUNCTIONS_URL}/api/jobs',
            json=payload,
            timeout=30
        )
        try:
            data = resp.json()
        except ValueError:
            return jsonify({'error': f'Invalid JSON response from Azure Functions: {resp.text}.'}), 502
        return jsonify(data), resp.status_code
    except requests.RequestException as exc:
        return jsonify({'error': f'Gateway error: {exc}'}), 502


@app.route('/api/proxy/jobs/<job_id>/chunks', methods=['POST'])
@login_required
def proxy_upload_chunk(job_id):
    payload = request.get_json(force=True) or {}
    try:
        resp = requests.post(
            f'{AZURE_FUNCTIONS_URL}/api/jobs/{job_id}/chunks',
            json=payload,
            timeout=30
        )
        return jsonify(resp.json()), resp.status_code
    except requests.RequestException as exc:
        return jsonify({'error': f'Gateway error: {exc}'}), 502


@app.route('/api/proxy/jobs', methods=['GET'])
@login_required
def proxy_get_jobs():
    """
    Returns the current user's job list.
    TODO: Replace stub with a query against the Azure SQL ImportJobs table
          filtered by userId = current_user.id once the schema is confirmed.
    """
    return jsonify([])


@app.route('/api/proxy/jobs/<job_id>', methods=['GET'])
@login_required
def proxy_get_job(job_id):
    """
    Returns detail for a single job owned by the current user.
    TODO: Replace stub with Azure SQL query + ownership check.
    """
    return jsonify({'stub': True, 'message': 'Job detail not yet available.'}), 404

# ─── CLI commands ─────────────────────────────────────────────────────────────

@app.cli.command('create-user')
@click.argument('username')
@click.argument('password')
@click.option('--admin', is_flag=True, default=False, help='Grant admin privileges.')
def create_user(username, password, admin):
    """Create a new user account. Run: flask create-user <username> <password>"""
    with app.app_context():
        if User.query.filter_by(username=username).first():
            click.echo(f'Error: user "{username}" already exists.', err=True)
            return
        user = User(username=username, is_admin=admin)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        role = 'admin' if admin else 'user'
        click.echo(f'Created {role} account: {username}')


@app.cli.command('init-db')
def init_db():
    """Create all database tables (safe to run multiple times)."""
    with app.app_context():
        db.create_all()
        click.echo('Database initialised.')

# ─── Startup ──────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)