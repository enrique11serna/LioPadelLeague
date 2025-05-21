import os
import sys

# Asegurar que podemos importar desde src/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, render_template, request, redirect
from flask_cors import CORS
from src.models import db, initialize_cards
from src.routes.auth import auth_bp
from src.routes.league import league_bp
from src.routes.match import match_bp
from src.routes.result import result_bp

# Crear la app y definir carpetas de estáticos y plantillas
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), 'static'),
    static_url_path='',  # <— importante: sirve /js/... /css/... /img/...
    template_folder=os.path.join(os.path.dirname(__file__), 'templates')
)
CORS(app)

# Configuración básica
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'changeme')

DB_USER     = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
DB_HOST     = os.getenv('DB_HOST', 'localhost')
DB_PORT     = os.getenv('DB_PORT', '3306')
DB_NAME     = os.getenv('DB_NAME', 'mydb')

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@"
    f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Forzar HTTPS en producción (Render pone RENDER=true)
@app.before_request
def force_https():
    if os.getenv('RENDER', '').lower() == 'true' \
       and request.headers.get('X-Forwarded-Proto', '') == 'http':
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)

# Inicializar DB y cartas
db.init_app(app)
with app.app_context():
    db.create_all()
    initialize_cards()

# Registrar blueprints
app.register_blueprint(auth_bp,    url_prefix='/api/auth')
app.register_blueprint(league_bp,  url_prefix='/api/leagues')
app.register_blueprint(match_bp,   url_prefix='/api')
app.register_blueprint(result_bp,  url_prefix='/api')

# Servir SPA y assets
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Si piden un archivo que exista en static/, lo devolvemos
    full_path = os.path.join(app.static_folder, path)
    if path and os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    # En cualquier otro caso devolvemos el index.html del SPA
    return render_template('index.html')

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', '').lower() != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
