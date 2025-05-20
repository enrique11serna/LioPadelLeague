import os
import sys

# Permitir imports desde la raíz de src
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, render_template, request, redirect
from flask_cors import CORS
from src.models import db, initialize_cards
from src.routes.auth import auth_bp
from src.routes.league import league_bp
from src.routes.match import match_bp
from src.routes.result import result_bp

# Crear la app indicando carpetas de estáticos y plantillas
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), 'static'),
    template_folder=os.path.join(os.path.dirname(__file__), 'templates')
)

# Habilitar CORS en toda la app
CORS(app)

# Configuración de entorno
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'cambia_esta_clave_en_produccion')
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://{os.getenv('DB_USERNAME')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Forzar HTTPS en Render (X-Forwarded-Proto)
@app.before_request
def force_https():
    if os.getenv('RENDER') == 'true' and request.headers.get('X-Forwarded-Proto') == 'http':
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)

# Inicializar BBDD y cartas
db.init_app(app)
with app.app_context():
    db.create_all()
    initialize_cards()

# Registrar blueprints bajo /api
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(league_bp, url_prefix='/api/leagues')
app.register_blueprint(match_bp, url_prefix='/api')
app.register_blueprint(result_bp, url_prefix='/api')

# Servir frontend (SPA) y archivos estáticos
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return render_template('index.html')


if __name__ == '__main__':
    # Puerto dinamico: Render usa PORT env var, local fallback a 5000
    port = int(os.getenv('PORT', 5000))
    # Desactivamos debug en prod
    debug = os.getenv('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
