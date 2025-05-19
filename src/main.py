import os
import sys
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Asegurar que se puede importar desde src/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, render_template, request, redirect
from flask_cors import CORS
from src.models import db
from src.routes.auth import auth_bp
from src.routes.league import league_bp
from src.routes.match import match_bp
from src.routes.result import result_bp
from src.models import initialize_cards

# Ruta absoluta al directorio base del proyecto (LioPadelLeague-main/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Crear app correctamente configurando static y templates desde BASE_DIR
app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, 'src', 'static'),
    template_folder=os.path.join(BASE_DIR, 'src', 'templates')
)

# Configurar CORS con más detalle
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Configuración básica
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('DB_USERNAME', 'root')}:{os.getenv('DB_PASSWORD', 'password')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'mydb')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Logging para depuración
@app.before_request
def log_request_info():
    if request.path.startswith('/api'):
        logger.info('Headers: %s', dict(request.headers))
        logger.info('Path: %s', request.path)
        logger.info('Method: %s', request.method)
        if request.is_json:
            logger.info('JSON Body: %s', request.json)

# Forzar HTTPS en producción
@app.before_request
def force_https( ):
    # Verificar si estamos en Render y la petición es HTTP
    if os.environ.get('RENDER', False) and request.headers.get('X-Forwarded-Proto') == 'http':
        url = request.url.replace('http://', 'https://', 1 )
        logger.info('Redirecting to HTTPS: %s', url)
        return redirect(url, code=301)

# Inicializar DB
db.init_app(app)
with app.app_context():
    db.create_all()
    initialize_cards()

# Registrar rutas (blueprints)
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(league_bp, url_prefix='/api/leagues')
app.register_blueprint(match_bp, url_prefix='/api')
app.register_blueprint(result_bp, url_prefix='/api')

# Ruta principal y archivos estáticos
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path == '' or not '.' in path:
        return render_template('index.html')
    return send_from_directory(app.static_folder, path)

# Lanzar servidor
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
