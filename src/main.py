import os
import sys

# Asegurar que se puede importar desde src/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, render_template, request, redirect
from flask_cors import CORS
from src.models import db, initialize_cards
from src.routes.auth import auth_bp
from src.routes.league import league_bp
from src.routes.match import match_bp
from src.routes.result import result_bp

# Crear la app y definir carpeta de estáticos y plantillas
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), 'static'),
    template_folder=os.path.join(os.path.dirname(__file__), 'templates')
)
CORS(app)

# Configuración básica
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'changeme')
# Aquí unificamos: DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
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

# Forzar HTTPS en producción Render
@app.before_request
def force_https():
    # Render pone la cabecera X-Forwarded-Proto: http/https
    if os.getenv('RENDER', '') == 'true' and request.headers.get('X-Forwarded-Proto', '') == 'http':
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
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return render_template('index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=(os.getenv('FLASK_ENV')!='production'))
